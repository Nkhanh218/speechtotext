/**
 * Webhook Save Result Handler
 * 
 * Lưu kết quả từ workflow chính để có thể truy xuất sau này
 * 
 * Cách sử dụng:
 * 1. Thêm node Function vào workflow chính sau node "Code"
 * 2. Sử dụng mã này trong node Function
 */

// Lấy dữ liệu đầu vào
const inputData = $input.first().json;

// Lấy execution ID
const executionId = $execution.id;

// Tạo đối tượng kết quả với execution ID
const result = {
  ...inputData,
  executionId: executionId,
  timestamp: new Date().toISOString()
};

// Trả về kết quả
return {
  json: result
};
