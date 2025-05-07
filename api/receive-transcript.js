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
      // Nếu bạn đã có URL webhook của n8n, hãy thay thế URL dưới đây
      const n8nWebhookUrl = 'https://namkhanh6503.app.n8n.cloud/webhook-test/audio-upload';
      
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
        if (contentType && contentType.includes('application/json')) {
          responseData = await n8nResponse.json();
        } else {
          responseData = await n8nResponse.text();
          try {
            // Cố gắng parse nếu nó là JSON string
            responseData = JSON.parse(responseData);
          } catch (e) {
            // Giữ nguyên dạng text nếu không phải JSON
          }
        }
        
        // Encode dữ liệu kết quả cho query parameter
        const encodedData = encodeURIComponent(JSON.stringify(responseData || data));
        const redirectUrl = `/receive-transcript.html?data=${encodedData}`;
        
        // Chuyển hướng đến trang receive-transcript.html với dữ liệu
        return res.redirect(302, redirectUrl);
        
      } catch (webhookError) {
        console.error('Lỗi khi gọi webhook n8n:', webhookError);
        
        // Vẫn chuyển hướng đến trang kết quả với dữ liệu gốc nếu gọi webhook thất bại
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
