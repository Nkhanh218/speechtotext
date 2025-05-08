// Serverless function để xử lý POST requests và chuyển tiếp đến n8n webhook
export default async function handler(req, res) {
  // Cho phép CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Xử lý OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Xử lý POST request
  if (req.method === 'POST') {
    try {
      // Nhận data từ body
      const data = req.body;

      // Kiểm tra xem có dữ liệu không
      if (!data) {
        return res.status(400).json({ error: 'Không nhận được dữ liệu' });
      }

      // Lấy URL webhook n8n từ environment variable hoặc sử dụng URL mặc định
      // LƯU Ý: Trong n8n, bạn cần nhấn nút "Test workflow" trên canvas để kích hoạt webhook trước khi gọi
      // URL webhook có thể thay đổi sau mỗi lần khởi động lại n8n, hãy kiểm tra URL trong n8n
      const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'https://namkhanh6503.app.n8n.cloud/webhook-test/audio-upload';

      try {
        // Gọi webhook n8n
        const n8nResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });

        // Lấy kết quả từ n8n
        let responseData;
        const contentType = n8nResponse.headers.get('content-type');

        console.log('Nhận phản hồi từ n8n với status:', n8nResponse.status);
        console.log('Content-Type:', contentType);

        if (n8nResponse.status >= 400) {
          console.error('Lỗi từ n8n webhook:', n8nResponse.status);
          // Nếu có lỗi, vẫn cố gắng đọc nội dung phản hồi
          const errorText = await n8nResponse.text();
          console.error('Chi tiết lỗi:', errorText);

          try {
            responseData = JSON.parse(errorText);
          } catch (e) {
            responseData = { error: errorText || 'Lỗi không xác định từ n8n' };
          }
        } else if (contentType && contentType.includes('application/json')) {
          responseData = await n8nResponse.json();
        } else {
          responseData = await n8nResponse.text();
          try {
            // Cố gắng parse nếu nó là JSON string
            responseData = JSON.parse(responseData);
          } catch (e) {
            // Giữ nguyên dạng text nếu không phải JSON
            console.log('Không thể parse phản hồi thành JSON, giữ nguyên dạng text');
          }
        }

        console.log('Dữ liệu nhận được từ n8n:', responseData);

        // Lấy văn bản từ kết quả (nếu có)
        let transcriptText = '';
        // Xử lý kết quả từ n8n hoặc DeepGram
        if (responseData && responseData.results && responseData.results.channels &&
            responseData.results.channels[0] && responseData.results.channels[0].alternatives &&
            responseData.results.channels[0].alternatives[0] && responseData.results.channels[0].alternatives[0].transcript) {
          transcriptText = responseData.results.channels[0].alternatives[0].transcript;
        } else if (Array.isArray(responseData) && responseData[0] && responseData[0].results &&
                  responseData[0].results.channels && responseData[0].results.channels[0] &&
                  responseData[0].results.channels[0].alternatives && responseData[0].results.channels[0].alternatives[0] &&
                  responseData[0].results.channels[0].alternatives[0].transcript) {
          transcriptText = responseData[0].results.channels[0].alternatives[0].transcript;
        } else if (typeof responseData === 'string') {
          try {
            const parsedData = JSON.parse(responseData);
            if (parsedData.transcript) {
              transcriptText = parsedData.transcript;
            } else if (parsedData.results && parsedData.results.channels &&
                      parsedData.results.channels[0] && parsedData.results.channels[0].alternatives &&
                      parsedData.results.channels[0].alternatives[0] && parsedData.results.channels[0].alternatives[0].transcript) {
              transcriptText = parsedData.results.channels[0].alternatives[0].transcript;
            }
          } catch (e) {
            // Nếu không phải JSON, có thể đã là văn bản
            transcriptText = responseData;
          }
        }

        // Kiểm tra các tiêu chí cho request API vs browser
        const acceptHeader = req.headers.accept || '';
        const queryFormat = req.query.format || '';
        const userAgent = req.headers['user-agent'] || '';

        // Nếu là request yêu cầu văn bản thô (format=text)
        if (queryFormat.toLowerCase() === 'text') {
          // Trả về văn bản
          console.log('Trả về văn bản thô');
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.setHeader('Content-Disposition', 'attachment; filename="transcript.txt"');
          return res.status(200).send(transcriptText);
        }
        // Nếu là request từ n8n hoặc có format=json, hoặc có header JSON
        // hoặc không phải từ trình duyệt
        else if (queryFormat.toLowerCase() === 'json' ||
            acceptHeader.includes('application/json') ||
            !userAgent.includes('Mozilla') && !userAgent.includes('Chrome') && !userAgent.includes('Safari') && !userAgent.includes('Edge') && !userAgent.includes('MSIE')) {
          // Trả về JSON cho n8n hoặc các API client khác
          console.log('Trả về JSON cho API client');
          return res.status(200).json(responseData || data);
        }
        // Trường hợp còn lại cho trình duyệt
        else {
          // Trả về chuyển hướng cho trình duyệt
          console.log('Trả về chuyển hướng cho trình duyệt');
          const encodedData = encodeURIComponent(JSON.stringify(responseData || data));
          const redirectUrl = `/receive-transcript.html?data=${encodedData}`;
          return res.redirect(302, redirectUrl);
        }

      } catch (webhookError) {
        console.error('Lỗi khi gọi webhook n8n:', webhookError);

        // Kiểm tra nếu lỗi là webhook không được đăng ký
        if (webhookError.message && (webhookError.message.includes('404') ||
            webhookError.message.includes('not registered') ||
            webhookError.message.includes('webhook'))) {
          console.log('Webhook không tồn tại hoặc chưa được kích hoạt. Chuyển hướng đến trang xử lý trực tiếp.');

          // Lưu dữ liệu vào localStorage để trang direct-transcript có thể sử dụng
          const errorMessage = 'Webhook n8n không hoạt động. Vui lòng mở n8n và nhấn nút "Test workflow" để kích hoạt webhook, hoặc sử dụng trang này để xử lý dữ liệu trực tiếp.';

          // Chuyển hướng đến trang xử lý trực tiếp với dữ liệu
          const encodedData = encodeURIComponent(JSON.stringify(data));
          const encodedError = encodeURIComponent(errorMessage);
          return res.redirect(302, `/direct-transcript.html?data=${encodedData}&error=${encodedError}`);
        }

        // Vẫn chuyển hướng đến trang kết quả với dữ liệu gốc nếu gọi webhook thất bại vì lý do khác
        const encodedData = encodeURIComponent(JSON.stringify(data));
        const redirectUrl = `/receive-transcript.html?data=${encodedData}&error=${encodeURIComponent(webhookError.message)}`;
        return res.redirect(302, redirectUrl);
      }
    } catch (error) {
      console.error('Lỗi xử lý request:', error);
      return res.status(500).json({ error: 'Lỗi xử lý request', details: error.message });
    }
  }

  // Xử lý GET request (để kiểm tra API đang hoạt động)
  if (req.method === 'GET') {
    return res.status(200).json({
      message: 'API endpoint đang hoạt động. Sử dụng POST để gửi dữ liệu phiên âm.',
      time: new Date().toISOString()
    });
  }

  // Phương thức không được hỗ trợ
  return res.status(405).json({ error: 'Phương thức không được hỗ trợ' });
}
