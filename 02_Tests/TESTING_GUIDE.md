# Testing Guide - Authentication System

This guide will help you test the JWT authentication system with your frontend.

## Prerequisites

1. **FastAPI Backend** must be running on `http://localhost:8000`
2. **Django Frontend** must be running (typically on `http://localhost:8001` or another port)

---

## Step 1: Start the Backend Server

First, make sure your FastAPI backend is running:

```bash
# Navigate to your FastAPI project directory (if separate)
# Then run:
uvicorn main:app --reload
```

**Verify it's running:**
- Open browser: http://localhost:8000/docs
- You should see Swagger UI with all API endpoints

---

## Step 2: Start the Django Frontend

In a **new terminal**, start the Django development server:

```bash
# From project root
python manage.py runserver
```

**Default URL:** http://127.0.0.1:8000 (or http://localhost:8000)

**⚠️ Port Conflict Note:** 
If your FastAPI backend is on port 8000, Django will use a different port automatically (like 8001). Check the terminal output for the actual URL.

---

## Step 3: Test the Authentication Flow

### Test 1: Registration

1. **Open your Django frontend** in a browser
2. **Click "Sign in"** button in the header
3. **Click "Register"** link at the bottom of the modal
4. **Fill in the form:**
   - Username: `testuser` (or any username)
   - Password: `testpass123`
5. **Click "Register"** button

**Expected Result:**
- ✅ Green success message: "Registration successful! Logging you in..."
- ✅ Modal closes automatically
- ✅ Page reloads
- ✅ "Sign in" button changes to show username (e.g., "testuser (Logout)")

**Check Browser Console:**
- Open Developer Tools (F12)
- Go to Console tab
- Should see no errors
- Go to Application/Storage tab → Local Storage
- Should see `access_token` and `refresh_token` stored

---

### Test 2: Login (if you already registered)

1. **Click "Sign in"** (or logout first if already logged in)
2. **Enter credentials:**
   - Username: `testuser`
   - Password: `testpass123`
3. **Click "Sign in"** button

**Expected Result:**
- ✅ Success message appears
- ✅ Modal closes
- ✅ User is authenticated
- ✅ Tokens stored in localStorage

---

### Test 3: Duplicate Registration

1. **Try to register** with the same username again
2. **Expected:** Red error message: "Username already exists. Please choose another."

---

### Test 4: Invalid Login

1. **Click "Sign in"**
2. **Enter wrong credentials:**
   - Username: `wronguser`
   - Password: `wrongpass`
3. **Click "Sign in"**

**Expected Result:**
- ✅ Red error message: "Incorrect username or password"

---

### Test 5: Logout

1. **If logged in**, click the username/logout button in header
2. **Expected:**
   - ✅ Page reloads
   - ✅ "Sign in" button appears again
   - ✅ Tokens removed from localStorage

---

## Step 4: Verify Token Storage

### Check LocalStorage

1. **Open Developer Tools** (F12)
2. **Go to Application tab** (Chrome) or **Storage tab** (Firefox)
3. **Click "Local Storage"** → `http://localhost:8000` (or your Django URL)
4. **Verify:**
   - `access_token` - JWT token (long string)
   - `refresh_token` - Refresh token (string)

### Test Token Manually

Open browser console and run:

```javascript
// Check if tokens exist
console.log('Access Token:', localStorage.getItem('access_token'));
console.log('Refresh Token:', localStorage.getItem('refresh_token'));

// Test API call manually
fetch('http://localhost:8000/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
})
.then(r => r.json())
.then(console.log);
```

**Expected:** User info object with `id`, `username`, `is_active`

---

## Step 5: Test Token Refresh

The frontend automatically handles token refresh. To test:

1. **Wait 30+ minutes** (access token expires), OR
2. **Manually expire token** in browser console:

```javascript
// Simulate expired token by clearing it
localStorage.removeItem('access_token');
// Keep refresh_token

// Then try to use the app - it should auto-refresh
```

---

## Step 6: Test with Browser DevTools

### Network Tab Monitoring

1. **Open DevTools** → **Network tab**
2. **Perform registration/login**
3. **Check requests:**
   - `POST /register` - Status 201
   - `POST /login` - Status 200
   - `GET /me` - Status 200 (after login)

### Console Errors

**Check for:**
- ❌ CORS errors
- ❌ 404 errors (wrong API URL)
- ❌ 500 errors (backend issue)
- ❌ Network errors (backend not running)

---

## Step 7: Test API Directly (Optional)

### Using Swagger UI

1. **Go to:** http://localhost:8000/docs
2. **Test endpoints:**
   - `/register` - Create a test user
   - `/login` - Get tokens
   - `/me` - Get user info (click "Authorize" button first)
   - `/refresh` - Refresh tokens
   - `/logout` - Revoke token

### Using cURL

```bash
# Register
curl -X POST "http://localhost:8000/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser2","password":"testpass123"}'

# Login
curl -X POST "http://localhost:8000/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser2&password=testpass123"

# Get user info (replace YOUR_TOKEN with actual token)
curl -X GET "http://localhost:8000/me" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Common Issues & Solutions

### Issue 1: CORS Error

**Error:** `Access to fetch at 'http://localhost:8000/...' from origin 'http://localhost:8001' has been blocked by CORS policy`

**Solution:**
- Make sure FastAPI backend has CORS enabled
- Check that backend allows your frontend origin

### Issue 2: 404 Not Found

**Error:** `POST http://localhost:8000/register 404`

**Solution:**
- Verify backend is running on port 8000
- Check API_BASE_URL in `login.js` matches your backend URL
- Test backend directly: http://localhost:8000/docs

### Issue 3: Network Error

**Error:** `Failed to fetch` or `NetworkError`

**Solution:**
- Backend server is not running
- Wrong URL in `login.js`
- Firewall blocking connection

### Issue 4: Modal Not Opening

**Solution:**
- Check browser console for JavaScript errors
- Verify `login.js` is loaded (check Network tab)
- Clear browser cache and reload

### Issue 5: Tokens Not Storing

**Solution:**
- Check browser localStorage is enabled
- Check for JavaScript errors in console
- Verify API response includes `access_token` and `refresh_token`

---

## Quick Test Checklist

- [ ] Backend server running on port 8000
- [ ] Frontend server running
- [ ] Can open frontend in browser
- [ ] "Sign in" button opens modal
- [ ] Can switch between Login/Register modes
- [ ] Registration works
- [ ] Login works
- [ ] Error messages display correctly
- [ ] Tokens stored in localStorage
- [ ] User info displayed after login
- [ ] Logout works
- [ ] No console errors

---

## Advanced Testing

### Test Token Expiration

```javascript
// In browser console, manually test refresh
window.authAPI.refreshAccessToken()
  .then(tokens => console.log('New tokens:', tokens))
  .catch(err => console.error('Refresh failed:', err));
```

### Test Logout

```javascript
// In browser console
window.authAPI.logout()
  .then(() => console.log('Logged out'))
  .catch(err => console.error('Logout error:', err));
```

### Check Auth Status

```javascript
// In browser console
console.log('Is authenticated:', window.authAPI.isAuthenticated());
console.log('Access token:', window.authAPI.getAccessToken());
```

---

## Need Help?

1. **Check browser console** for errors
2. **Check Network tab** for failed requests
3. **Verify backend is running:** http://localhost:8000/docs
4. **Check API documentation:** `API_DOCUMENTATION.md`
5. **Review frontend code:** `core/static/core/login.js`

---

**Happy Testing! 🎉**

