/**
 * Webhook Results Handler
 * 
 * Tạo một endpoint /results để client có thể polling kết quả từ workflow
 * 
 * Cách sử dụng:
 * 1. Thêm node Webhook mới vào workflow với path là "results"
 * 2. Kết nối node này với node Function chứa mã này
 * 3. Kết nối node Function với node Respond to Webhook
 */

// Lưu trữ kết quả từ các execution gần đây
const recentResults = new Map();
const MAX_RESULTS = 50; // Số lượng kết quả tối đa lưu trữ

// Hàm xử lý chính
async function getResults() {
  try {
    // Lấy thông tin từ request
    const req = $node.getInputData();
    const executionId = req[0].json?.query?.executionId;
    
    // Nếu có executionId, tìm kết quả cụ thể
    if (executionId) {
      console.log(`Đang tìm kết quả cho execution ID: ${executionId}`);
      
      // Kiểm tra trong cache
      if (recentResults.has(executionId)) {
        console.log(`Tìm thấy kết quả trong cache cho execution ID: ${executionId}`);
        return {
          json: recentResults.get(executionId)
        };
      }
      
      // Nếu không có trong cache, tìm trong lịch sử execution
      try {
        // Lấy thông tin execution từ n8n API
        const n8nUrl = $env.N8N_URL || 'https://namkhanh6503.app.n8n.cloud';
        const apiKey = $env.N8N_API_KEY || '';
        
        // Tạo URL để lấy thông tin execution
        const url = `${n8nUrl}/api/v1/executions/${executionId}`;
        
        // Gửi request để lấy thông tin execution
        const response = await $http.get(url, {
          headers: apiKey ? { 'X-N8N-API-KEY': apiKey } : {}
        });
        
        // Kiểm tra response
        if (response.status !== 200) {
          throw new Error(`Failed to get execution: ${response.statusText}`);
        }
        
        // Lấy dữ liệu từ execution
        const execution = response.data;
        
        // Kiểm tra trạng thái của execution
        if (execution.status !== 'success') {
          return {
            json: {
              message: 'Workflow is still running or failed',
              status: execution.status
            }
          };
        }
        
        // Tìm node "Create File Content" hoặc node cuối cùng
        const resultData = execution.data.resultData.runData;
        let result = null;
        
        // Tìm theo thứ tự ưu tiên
        const nodeNames = [
          'Create File Content',
          'Code',
          'HTTP Request to Deepgram',
          'Fix Binary Data'
        ];
        
        for (const nodeName of nodeNames) {
          if (resultData[nodeName] && resultData[nodeName].length > 0) {
            result = resultData[nodeName][0].data.main[0][0];
            console.log(`Tìm thấy kết quả từ node ${nodeName}`);
            break;
          }
        }
        
        // Nếu không tìm thấy, lấy node cuối cùng
        if (!result) {
          const lastNodeName = Object.keys(resultData).pop();
          if (lastNodeName && resultData[lastNodeName].length > 0) {
            result = resultData[lastNodeName][0].data.main[0][0];
            console.log(`Tìm thấy kết quả từ node cuối cùng ${lastNodeName}`);
          }
        }
        
        // Nếu tìm thấy kết quả, lưu vào cache
        if (result) {
          recentResults.set(executionId, result);
          
          // Giới hạn kích thước cache
          if (recentResults.size > MAX_RESULTS) {
            const oldestKey = recentResults.keys().next().value;
            recentResults.delete(oldestKey);
          }
          
          return {
            json: result
          };
        }
        
        // Nếu không tìm thấy kết quả
        return {
          json: {
            error: 'No result data found in execution'
          }
        };
      } catch (error) {
        console.error('Error fetching execution:', error);
        return {
          json: {
            error: `Failed to get execution data: ${error.message}`
          }
        };
      }
    }
    
    // Nếu không có executionId, trả về kết quả gần đây nhất
    if (recentResults.size > 0) {
      const latestKey = Array.from(recentResults.keys()).pop();
      return {
        json: recentResults.get(latestKey)
      };
    }
    
    // Nếu không có kết quả nào
    return {
      json: {
        error: 'No recent results found'
      }
    };
  } catch (error) {
    console.error('Error in getResults:', error);
    return {
      json: {
        error: `Internal server error: ${error.message}`
      }
    };
  }
}

// Lưu kết quả vào cache
function saveResult(executionId, result) {
  if (!executionId || !result) return;
  
  recentResults.set(executionId, result);
  
  // Giới hạn kích thước cache
  if (recentResults.size > MAX_RESULTS) {
    const oldestKey = recentResults.keys().next().value;
    recentResults.delete(oldestKey);
  }
}

// Xuất hàm chính
return getResults();
