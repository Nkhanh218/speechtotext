// Serverless function để xử lý POST requests từ n8n
export default function handler(req, res) {
  // Cho phép CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Xử lý OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Xử lý POST request từ n8n
  if (req.method === 'POST') {
    try {
      // Nhận data từ body
      const data = req.body;

      // Kiểm tra xem có dữ liệu không
      if (!data) {
        return res.status(400).json({ error: 'Không nhận được dữ liệu' });
      }

      // Tạo URL với dữ liệu dưới dạng query parameter
      const encodedData = encodeURIComponent(JSON.stringify(data));
      const redirectUrl = `/receive-transcript.html?data=${encodedData}`;

      // Chuyển hướng đến trang receive-transcript.html với dữ liệu
      return res.redirect(302, redirectUrl);
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
