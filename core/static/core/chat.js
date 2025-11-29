// Chat functionality with PDF upload and text extraction
// Use API_BASE_URL from login.js if available, otherwise use default
const CHAT_API_BASE_URL = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://localhost:8000';

document.addEventListener('DOMContentLoaded', function () {
  console.log('Chat.js loaded and initialized');
  const fileInput = document.getElementById('cv-file-input');
  const uploadBtn = document.getElementById('cv-upload-btn');
  const chatInput = document.getElementById('cv-chat-input');
  const sendBtn = document.getElementById('cv-send-btn');
  const chatWindow = document.querySelector('.cv-chat-window');
  const inputRow = document.getElementById('cv-chat-input-row') || document.querySelector('.cv-chat-input-row');

  if (!fileInput || !uploadBtn || !chatInput || !sendBtn || !chatWindow || !inputRow) {
    console.error('Chat elements not found:', {
      fileInput: !!fileInput,
      uploadBtn: !!uploadBtn,
      chatInput: !!chatInput,
      sendBtn: !!sendBtn,
      chatWindow: !!chatWindow,
      inputRow: !!inputRow
    });
    return;
  }

  // File upload button click - use mousedown to ensure it works
  uploadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Upload button clicked');
    fileInput.click();
  });

  // Also handle mousedown as fallback
  uploadBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
  });

  // Handle file selection
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    handleFile(file);
  });

  // Drag and drop functionality
  inputRow.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    inputRow.classList.add('cv-drag-over');
  });

  inputRow.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    inputRow.classList.remove('cv-drag-over');
  });

  inputRow.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    inputRow.classList.remove('cv-drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  // Also make the entire chat window a drop zone
  chatWindow.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    chatWindow.classList.add('cv-drag-over');
  });

  chatWindow.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    chatWindow.classList.remove('cv-drag-over');
  });

  chatWindow.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    chatWindow.classList.remove('cv-drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  // Handle file processing
  async function handleFile(file) {
    // Validate file type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showError('Please select a PDF file.');
      return;
    }

    // Show loading state
    uploadBtn.disabled = true;
    uploadBtn.textContent = '⏳';
    
    try {
      await uploadAndExtractPDF(file);
    } catch (error) {
      console.error('PDF upload error:', error);
      showError('Failed to extract text from PDF. Please try again.');
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = '+';
      fileInput.value = ''; // Reset file input
    }
  }

  // Send button click
  sendBtn.addEventListener('click', () => {
    sendMessage();
  });

  // Enter key to send
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  // Upload PDF and extract text
  async function uploadAndExtractPDF(file) {
    const formData = new FormData();
    formData.append('file', file);

    // Show user message that file is being uploaded
    addUserMessage(`Uploading ${file.name}...`);

    try {
      const response = await fetch(`${CHAT_API_BASE_URL}/extract-text`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser sets it automatically with boundary
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to extract text from PDF');
      }

      // Log to console
      console.log('=== PDF Text Extraction Result ===');
      console.log('Filename:', data.filename);
      console.log('Pages:', data.pages);
      console.log('Characters:', data.characters);
      console.log('Extracted Text:', data.text);
      console.log('===================================');

      // Update user message
      updateLastUserMessage(`Uploaded ${file.name} (${data.pages} pages)`);

      // Show extracted text in chat
      if (data.text && data.text.trim()) {
        addAIMessage(
          `Successfully extracted text from your CV (${data.pages} pages, ${data.characters} characters).\n\n` +
          `**Extracted Text Preview:**\n${data.text.substring(0, 500)}${data.text.length > 500 ? '...' : ''}`
        );
      } else {
        addAIMessage(
          `PDF uploaded successfully (${data.pages} pages), but no extractable text was found. ` +
          `This might be a scanned/image-based PDF.`
        );
      }

    } catch (error) {
      console.error('PDF extraction error:', error);
      throw error;
    }
  }

  // Send text message
  function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message to chat
    addUserMessage(message);
    
    // Clear input
    chatInput.value = '';

    // Log to console
    console.log('User message:', message);

    // For now, just echo back (you can integrate with AI later)
    // addAIMessage('I received your message: ' + message);
  }

  // Add user message to chat
  function addUserMessage(text) {
    const row = document.createElement('div');
    row.className = 'cv-chat-row cv-chat-row-user';
    
    const avatar = document.createElement('div');
    avatar.className = 'cv-avatar cv-avatar-user';
    avatar.textContent = 'U';
    
    const bubble = document.createElement('div');
    bubble.className = 'cv-chat-bubble cv-chat-bubble-user';
    bubble.textContent = text;
    
    row.appendChild(avatar);
    row.appendChild(bubble);
    chatWindow.appendChild(row);
    
    // Scroll to bottom
    scrollToBottom();
  }

  // Update last user message (for file upload status)
  function updateLastUserMessage(text) {
    const rows = chatWindow.querySelectorAll('.cv-chat-row-user');
    if (rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      const bubble = lastRow.querySelector('.cv-chat-bubble-user');
      if (bubble) {
        bubble.textContent = text;
      }
    }
  }

  // Add AI message to chat
  function addAIMessage(text) {
    const row = document.createElement('div');
    row.className = 'cv-chat-row cv-chat-row-ai';
    
    const bubble = document.createElement('div');
    bubble.className = 'cv-chat-bubble cv-chat-bubble-ai';
    
    // Handle multi-line text with line breaks
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
        // Bold heading
        const heading = document.createElement('p');
        heading.className = 'cv-chat-heading';
        heading.textContent = line.replace(/\*\*/g, '');
        bubble.appendChild(heading);
      } else {
        const p = document.createElement('p');
        p.textContent = line || '\u00A0'; // Non-breaking space for empty lines
        if (index === 0 && lines.length > 1) {
          p.style.marginTop = '0';
        }
        bubble.appendChild(p);
      }
    });
    
    const avatar = document.createElement('div');
    avatar.className = 'cv-avatar cv-avatar-ai';
    avatar.textContent = 'AI';
    
    row.appendChild(bubble);
    row.appendChild(avatar);
    chatWindow.appendChild(row);
    
    // Scroll to bottom
    scrollToBottom();
  }

  // Show error message
  function showError(message) {
    console.error('Chat error:', message);
    addAIMessage(`❌ Error: ${message}`);
  }

  // Scroll chat window to bottom
  function scrollToBottom() {
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
});

