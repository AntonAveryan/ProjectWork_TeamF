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
    chatInput.disabled = true;
    sendBtn.disabled = true;
    
    try {
      await uploadAndExtractPDF(file);
    } catch (error) {
      console.error('PDF upload error:', error);
      showError(error.message || 'Failed to analyze PDF. Please try again.');
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = '+';
      chatInput.disabled = false;
      sendBtn.disabled = false;
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

  // Upload PDF and analyze career fields
  async function uploadAndExtractPDF(file) {
    const formData = new FormData();
    formData.append('file', file);

    // Get access token if user is authenticated
    const accessToken = localStorage.getItem('access_token');
    
    // Prepare headers
    const headers = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Show user message that file is being uploaded
    addUserMessage(`Uploading ${file.name}...`);
    
    // Show loading message (analysis can take 30-60 seconds)
    const loadingMessageId = addAIMessageWithId('⏳ Analyzing your CV and identifying potential career fields... This may take 30-60 seconds.');

    try {
      const response = await fetch(`${CHAT_API_BASE_URL}/extract-text`, {
        method: 'POST',
        headers: headers,
        body: formData,
        // Don't set Content-Type header - browser sets it automatically with boundary
      });

      const data = await response.json();

      // Remove loading message
      removeMessage(loadingMessageId);

      // Check for error in response (even if status is 200)
      if (data.error) {
        throw new Error(data.error);
      }

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to analyze PDF');
      }

      // Log to console
      console.log('=== Career Analysis Result ===');
      console.log('Filename:', data.filename);
      console.log('Pages:', data.pages);
      console.log('Characters:', data.characters);
      console.log('Career Fields Found:', data.career_fields?.length || 0);
      console.log('Saved to DB:', data.saved_to_db || false);
      console.log('Career Fields:', data.career_fields);
      console.log('Overall Summary:', data.overall_summary);
      console.log('===================================');

      // Update user message
      updateLastUserMessage(`Uploaded ${file.name} (${data.pages} pages)`);

      // Display career analysis results
      displayCareerAnalysis(data);

    } catch (error) {
      console.error('PDF analysis error:', error);
      throw error;
    }
  }

  // Display career analysis results in chat
  function displayCareerAnalysis(data) {
    let message = '';

    // Check if we have career fields
    if (data.career_fields && data.career_fields.length > 0) {
      message += `**Career Analysis Complete!**\n\n`;
      message += `I've analyzed your CV and identified ${data.career_fields.length} potential career field${data.career_fields.length > 1 ? 's' : ''}:\n\n`;

      // Display each career field
      data.career_fields.forEach((field, index) => {
        message += `**${index + 1}. ${field.field}**\n`;
        if (field.summary) {
          message += `${field.summary}\n`;
        }
        if (field.key_skills_mentioned && field.key_skills_mentioned.length > 0) {
          message += `Key Skills: ${field.key_skills_mentioned.join(', ')}\n`;
        }
        message += '\n';
      });

      // Overall summary
      if (data.overall_summary) {
        message += `**Overall Assessment:**\n${data.overall_summary}\n\n`;
      }

      // Database save status
      if (data.saved_to_db) {
        message += `✅ Your career fields and skills have been saved to your profile.`;
      } else {
        message += `ℹ️ Sign in to save your career analysis to your profile.`;
      }
    } else {
      // No career fields found
      message += `**Analysis Complete**\n\n`;
      message += `I've processed your CV (${data.pages} pages, ${data.characters} characters), `;
      message += `but couldn't identify specific career fields. `;
      message += `This might be because:\n`;
      message += `- The PDF is image-based (scanned document)\n`;
      message += `- The text content is limited\n`;
      message += `- The LLM service encountered an issue\n\n`;
      message += `Please try uploading a text-based PDF with more detailed information.`;
    }

    addAIMessage(message);
  }

  // Add message and return ID for removal
  function addAIMessageWithId(text) {
    const row = document.createElement('div');
    row.className = 'cv-chat-row cv-chat-row-ai';
    const messageId = 'msg-' + Date.now() + '-' + Math.random();
    row.id = messageId;
    
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
    
    return messageId;
  }

  // Remove message by ID
  function removeMessage(messageId) {
    const message = document.getElementById(messageId);
    if (message) {
      message.remove();
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
    return addAIMessageWithId(text);
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

