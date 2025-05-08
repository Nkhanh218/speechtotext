/**
 * n8n-direct-integration.js
 * 
 * Script để tích hợp trực tiếp với n8n webhook để chuyển đổi voice thành text
 * và tải xuống các định dạng file khác nhau.
 */

// Cấu hình
const config = {
    // Thay đổi URL này thành URL webhook n8n của bạn
    webhookUrl: 'https://your-n8n-instance.com/webhook/audio-upload',
    
    // Các định dạng file hỗ trợ
    supportedFormats: ['txt', 'docx', 'srt']
};

// Lưu trữ dữ liệu phiên âm
let transcriptionData = null;

/**
 * Khởi tạo tích hợp n8n
 * @param {Object} options - Tùy chọn cấu hình
 */
function initN8nIntegration(options = {}) {
    // Ghi đè cấu hình mặc định
    Object.assign(config, options);
    
    // Gắn sự kiện cho nút tải xuống
    attachDownloadHandlers();
    
    console.log('Đã khởi tạo tích hợp n8n với webhook URL:', config.webhookUrl);
}

/**
 * Gửi file âm thanh đến n8n webhook
 * @param {File|String} audioSource - File âm thanh hoặc URL
 * @param {Function} onSuccess - Callback khi thành công
 * @param {Function} onError - Callback khi có lỗi
 * @param {Function} onProgress - Callback cập nhật tiến trình
 */
async function sendAudioToN8n(audioSource, onSuccess, onError, onProgress) {
    try {
        // Hiển thị trạng thái đang xử lý
        if (onProgress) onProgress('Đang chuẩn bị dữ liệu...');
        
        // Chuẩn bị dữ liệu để gửi
        let payload;
        
        if (typeof audioSource === 'string') {
            // Nếu là URL
            payload = JSON.stringify({ url: audioSource });
            
            if (onProgress) onProgress('Đang gửi URL âm thanh đến máy chủ...');
        } else {
            // Nếu là File, tạo FormData
            const formData = new FormData();
            formData.append('file', audioSource);
            
            // Hoặc chuyển đổi thành base64 và gửi dưới dạng JSON
            if (audioSource.size > 10 * 1024 * 1024) { // Nếu file > 10MB
                if (onProgress) onProgress('File quá lớn, đang chuyển đổi...');
                
                // Chuyển đổi file thành base64
                const base64Data = await fileToBase64(audioSource);
                payload = JSON.stringify({ 
                    audio_base64: base64Data,
                    filename: audioSource.name
                });
                
                if (onProgress) onProgress('Đang gửi dữ liệu âm thanh đến máy chủ...');
            } else {
                payload = formData;
                if (onProgress) onProgress('Đang tải file âm thanh lên máy chủ...');
            }
        }
        
        // Cấu hình request
        const requestOptions = {
            method: 'POST',
            headers: {}
        };
        
        // Nếu payload là JSON string, thêm header Content-Type
        if (typeof payload === 'string') {
            requestOptions.headers['Content-Type'] = 'application/json';
            requestOptions.body = payload;
        } else {
            // Nếu là FormData, không cần thêm Content-Type
            requestOptions.body = payload;
        }
        
        // Gửi request đến n8n webhook
        const response = await fetch(config.webhookUrl, requestOptions);
        
        // Kiểm tra response
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Parse JSON response
        const data = await response.json();
        
        // Lưu dữ liệu phiên âm
        transcriptionData = data;
        
        // Gọi callback thành công
        if (onSuccess) onSuccess(data);
        
        return data;
    } catch (error) {
        console.error('Lỗi khi gửi âm thanh đến n8n:', error);
        
        // Gọi callback lỗi
        if (onError) onError(error.message);
        
        throw error;
    }
}

/**
 * Chuyển đổi File thành base64
 * @param {File} file - File cần chuyển đổi
 * @returns {Promise<string>} - Chuỗi base64
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

/**
 * Gắn sự kiện cho các nút tải xuống
 */
function attachDownloadHandlers() {
    // Tìm các nút tải xuống trong trang
    config.supportedFormats.forEach(format => {
        const buttonId = `download${format.toUpperCase()}`;
        const button = document.getElementById(buttonId);
        
        if (button) {
            button.addEventListener('click', () => {
                downloadTranscription(format);
            });
        }
    });
}

/**
 * Tải xuống phiên âm theo định dạng
 * @param {string} format - Định dạng file (txt, docx, srt)
 */
function downloadTranscription(format) {
    if (!transcriptionData) {
        alert('Không có dữ liệu phiên âm để tải xuống');
        return;
    }
    
    let content = '';
    let filename = `transcript.${format}`;
    let mimeType = 'text/plain';
    
    // Lấy nội dung file từ dữ liệu phiên âm
    if (transcriptionData.fileContents && transcriptionData.fileContents[format]) {
        content = transcriptionData.fileContents[format];
    } else {
        // Nếu không có sẵn, tạo nội dung từ văn bản
        const text = getTranscriptText();
        
        if (!text) {
            alert('Không tìm thấy văn bản phiên âm');
            return;
        }
        
        switch (format) {
            case 'txt':
                content = text;
                break;
                
            case 'docx':
                // Tạo DOCX đơn giản (thực tế là XML)
                content = `
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                      <w:body>
                        <w:p>
                          <w:r>
                            <w:t>${text}</w:t>
                          </w:r>
                        </w:p>
                      </w:body>
                    </w:document>
                `;
                mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                break;
                
            case 'srt':
                // Tạo SRT từ dữ liệu words nếu có
                content = createSrtContent();
                break;
        }
    }
    
    // Tải xuống file
    downloadFile(content, filename, mimeType);
}

/**
 * Lấy văn bản phiên âm từ dữ liệu
 * @returns {string} - Văn bản phiên âm
 */
function getTranscriptText() {
    if (!transcriptionData) return '';
    
    // Tìm văn bản từ nhiều vị trí có thể
    if (transcriptionData.plainText) {
        return transcriptionData.plainText;
    } else if (transcriptionData.data && transcriptionData.data.transcript) {
        return transcriptionData.data.transcript;
    } else if (Array.isArray(transcriptionData) && transcriptionData[0]?.results?.channels[0]?.alternatives[0]?.transcript) {
        return transcriptionData[0].results.channels[0].alternatives[0].transcript;
    } else if (transcriptionData.results?.channels[0]?.alternatives[0]?.transcript) {
        return transcriptionData.results.channels[0].alternatives[0].transcript;
    }
    
    return '';
}

/**
 * Tạo nội dung SRT từ dữ liệu words
 * @returns {string} - Nội dung SRT
 */
function createSrtContent() {
    let words = [];
    
    // Tìm dữ liệu words từ nhiều vị trí có thể
    if (transcriptionData.data && transcriptionData.data.words) {
        words = transcriptionData.data.words;
    } else if (Array.isArray(transcriptionData) && transcriptionData[0]?.results?.channels[0]?.alternatives[0]?.words) {
        words = transcriptionData[0].results.channels[0].alternatives[0].words;
    } else if (transcriptionData.results?.channels[0]?.alternatives[0]?.words) {
        words = transcriptionData.results.channels[0].alternatives[0].words;
    }
    
    if (words.length === 0) {
        return 'No transcript data available';
    }
    
    // Tạo nội dung SRT
    let srtContent = '';
    const chunkSize = 10; // Số từ trong một subtitle
    
    for (let i = 0; i < words.length; i += chunkSize) {
        const chunk = words.slice(i, i + chunkSize);
        if (chunk.length === 0) continue;
        
        const chunkNum = Math.floor(i / chunkSize) + 1;
        const startTime = formatSrtTime(chunk[0].start);
        const endTime = formatSrtTime(chunk[chunk.length - 1].end);
        const text = chunk.map(w => w.punctuated_word || w.word).join(' ');
        
        srtContent += `${chunkNum}\n${startTime} --> ${endTime}\n${text}\n\n`;
    }
    
    return srtContent;
}

/**
 * Định dạng thời gian cho SRT
 * @param {number} seconds - Thời gian tính bằng giây
 * @returns {string} - Chuỗi thời gian định dạng SRT
 */
function formatSrtTime(seconds) {
    seconds = parseFloat(seconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
    
    return `${padZero(hours, 2)}:${padZero(minutes, 2)}:${padZero(secs, 2)},${padZero(ms, 3)}`;
}

/**
 * Thêm số 0 đằng trước
 * @param {number} num - Số cần thêm 0
 * @param {number} size - Độ dài mong muốn
 * @returns {string} - Chuỗi số đã thêm 0
 */
function padZero(num, size) {
    let s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}

/**
 * Tải xuống file
 * @param {string} content - Nội dung file
 * @param {string} filename - Tên file
 * @param {string} mimeType - Kiểu MIME
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// Export các hàm để sử dụng
window.n8nIntegration = {
    init: initN8nIntegration,
    sendAudio: sendAudioToN8n,
    download: downloadTranscription,
    getData: () => transcriptionData
};
