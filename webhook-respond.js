/**
 * Webhook Respond Handler
 * 
 * Trả về phản hồi ban đầu cho trang web
 * 
 * Cách sử dụng:
 * 1. Thêm node "Respond to Webhook" vào workflow chính sau node "Save Result"
 * 2. Sử dụng mã này trong phần "Response Body" của node "Respond to Webhook"
 */

// Lấy execution ID
const executionId = $execution.id;

// Tạo đối tượng phản hồi
const response = {
  message: "Workflow was started",
  executionId: executionId
};

// Trả về phản hồi
return response;
