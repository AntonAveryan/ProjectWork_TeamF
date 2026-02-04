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
  const emptyMessage = document.getElementById('cv-chat-empty-message');
  const streamingText = document.getElementById('cv-streaming-text');

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

  // Streaming text animation
  let streamingInterval = null;
  const fullText = 'We are ready to start...';
  let currentIndex = 0;

  function startStreaming() {
    if (!streamingText || streamingInterval) return;
    currentIndex = 0;
    streamingText.textContent = '';

    streamingInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        streamingText.textContent += fullText[currentIndex];
        currentIndex++;
      } else {
        // Restart from beginning
        currentIndex = 0;
        streamingText.textContent = '';
      }
    }, 100);
  }

  function stopStreaming() {
    if (streamingInterval) {
      clearInterval(streamingInterval);
      streamingInterval = null;
    }
    if (emptyMessage) {
      emptyMessage.style.display = 'none';
    }
  }

  function checkChatEmpty() {
    if (!chatWindow) return;
    const chatRows = chatWindow.querySelectorAll('.cv-chat-row');
    if (chatRows.length === 0) {
      if (emptyMessage) {
        emptyMessage.style.display = 'block';
        startStreaming();
      }
    } else {
      stopStreaming();
    }
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
  sendBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('Send button clicked');
    sendMessage();
  });

  // Enter key to send
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      console.log('Enter key pressed');
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

    // Hide empty message when message is added
    checkChatEmpty();

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
  async function sendMessage() {
    console.log('sendMessage() called');
    const message = chatInput.value.trim();
    console.log('Message value:', message);
    
    if (!message) {
      console.log('Message is empty, returning');
      return;
    }

    console.log('Adding user message to chat');
    // Add user message to chat
    addUserMessage(message);
    
    // Clear input immediately for better UX
    chatInput.value = '';
    
    // Disable input and send button while processing
    chatInput.disabled = true;
    sendBtn.disabled = true;

    // Log to console
    console.log('User message:', message);
    console.log('CHAT_API_BASE_URL:', CHAT_API_BASE_URL);

    // Show loading indicator
    const loadingMessageId = addAIMessageWithId('⏳ Thinking...');
    console.log('Loading message ID:', loadingMessageId);

    try {
      // Get access token
      const accessToken = localStorage.getItem('access_token');
      console.log('Access token exists:', !!accessToken);
      
      if (!accessToken) {
        // User not logged in
        console.log('No access token, showing sign-in message');
        removeMessage(loadingMessageId);
        addAIMessage('Please sign in to chat with the AI career coach. Your conversation will be personalized based on your CV analysis.');
        chatInput.disabled = false;
        sendBtn.disabled = false;
        return;
      }

      const requestUrl = `${CHAT_API_BASE_URL}/career-chat`;
      const requestBody = JSON.stringify({ message: message });
      console.log('Calling career-chat endpoint:', requestUrl);
      console.log('Request body:', requestBody);
      console.log('Request headers:', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken.substring(0, 20)}...`,
      });

      // Call career-chat endpoint
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: requestBody,
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      // Remove loading message
      removeMessage(loadingMessageId);

      if (!response.ok) {
        // Handle different error statuses
        let errorMessage = 'AI is currently unavailable, please try again.';
        
        if (response.status === 401) {
          errorMessage = 'Please sign in to use the AI career coach.';
        } else if (response.status === 502 || response.status === 504) {
          errorMessage = 'AI service is temporarily unavailable. Please try again in a moment.';
        } else {
          try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.message || errorMessage;
            console.log('Error response data:', errorData);
          } catch (_) {
            console.log('Could not parse error response as JSON');
            // Use default error message
          }
        }
        
        console.log('Showing error message:', errorMessage);
        addAIMessage(`❌ ${errorMessage}`);
        chatInput.disabled = false;
        sendBtn.disabled = false;
        return;
      }

      // Parse response
      const data = await response.json();
      console.log('Response data:', data);
      const assistantReply = data.answer || 'I apologize, but I could not generate a response. Please try again.';
      console.log('Assistant reply:', assistantReply);

      // Display AI's reply
      addAIMessage(assistantReply);

    } catch (error) {
      console.error('Error calling career-chat:', error);
      console.error('Error stack:', error.stack);
      removeMessage(loadingMessageId);
      
      // Network errors or other exceptions
      let errorMessage = 'AI is currently unavailable, please try again.';
      if (error.message && error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      addAIMessage(`❌ ${errorMessage}`);
    } finally {
      // Re-enable input and send button
      chatInput.disabled = false;
      sendBtn.disabled = false;
      chatInput.focus(); // Return focus to input for better UX
      console.log('sendMessage() completed');
    }
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

    // Hide empty message when first message is added
    checkChatEmpty();

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
    const id = addAIMessageWithId(text);
    // Hide empty message when message is added
    checkChatEmpty();
    return id;
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

  // --- Career chat history (GET /career-chat/history, DELETE /career-chat/history) ---
  const DEFAULT_GREETING = 'Hi, how can I help you? Upload your CV and I will analyze and help find positions.';

  function clearChatRows() {
    chatWindow.querySelectorAll('.cv-chat-row').forEach(row => row.remove());
  }

  function restoreDefaultGreeting() {
    addAIMessage(DEFAULT_GREETING);
    checkChatEmpty();
    scrollToBottom();
  }

  async function deleteChatHistory() {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      addAIMessage('Please sign in to clear chat history.');
      return;
    }

    const btn = document.getElementById('cv-clear-history-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '…';
    }

    try {
      const response = await fetch(`${CHAT_API_BASE_URL}/career-chat/history`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.status === 204) {
        clearChatRows();
        restoreDefaultGreeting();
      } else {
        let msg = 'Failed to clear history.';
        try {
          const data = await response.json();
          msg = data.detail || msg;
        } catch (_) {}
        addAIMessage(`❌ ${msg}`);
      }
    } catch (e) {
      console.error('Delete chat history error', e);
      addAIMessage('❌ Could not clear history. Please try again.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = btn.dataset.resetLabel || 'Clear history';
      }
    }
  }

  const clearHistoryBtn = document.getElementById('cv-clear-history-btn');
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', deleteChatHistory);
  }

  async function fetchChatHistory() {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) return;

    try {
      const response = await fetch(`${CHAT_API_BASE_URL}/career-chat/history`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) return;

      const messages = await response.json();
      if (!Array.isArray(messages) || messages.length === 0) return;

      clearChatRows();
      messages.forEach(function (msg) {
        if (msg.role === 'user') {
          addUserMessage(msg.content || '');
        } else {
          addAIMessage((msg.content || '').trim() || '\u00A0');
        }
      });
      checkChatEmpty();
      scrollToBottom();
    } catch (e) {
      console.warn('Failed to load chat history', e);
    }
  }

  // Initialize: load history if signed in, then check empty state
  if (emptyMessage && chatWindow) {
    fetchChatHistory().then(function () {
      const chatRows = chatWindow.querySelectorAll('.cv-chat-row');
      if (chatRows.length > 0) {
        emptyMessage.style.display = 'none';
        stopStreaming();
      } else {
        emptyMessage.style.display = 'block';
        startStreaming();
      }
    });
  }
});

