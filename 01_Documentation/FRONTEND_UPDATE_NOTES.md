# Frontend Update Notes - Job Scraping Improvements

## Changes Made

### 1. Fixed "Unknown" Values
- **Company name** and **location** are now properly extracted from LinkedIn API
- If data is not available, fields will be `null` instead of "Unknown"
- Frontend should handle `null` values gracefully (show "Not specified" or hide the field)

### 2. Added Job Links
- All jobs now include `apply_link` field with direct LinkedIn job URL
- Format: `https://www.linkedin.com/jobs/view/{job_id}`
- Frontend can use this for "Apply" button/link

### 3. Removed Empty Descriptions
- `description` field is now `null` instead of empty string
- Description requires separate API call (slows down scraping), so it's omitted for now
- Frontend should not show "No description available" - just hide description section if `null`

## Updated Response Format

**Before:**
```json
{
  "title": "Software Engineer",
  "company": "Unknown",
  "location": "Unknown",
  "apply_link": "",
  "description": ""
}
```

**After:**
```json
{
  "title": "Software Engineer",
  "company": "Tech Corp",  // or null if not available
  "location": "London, UK",  // or null if not available
  "apply_link": "https://www.linkedin.com/jobs/view/123456",
  "description": null
}
```

## Frontend Implementation

### Display Logic

```javascript
// Company
{job.company || 'Company not specified'}

// Location  
{job.location || 'Location not specified'}

// Apply Link
{job.apply_link && (
  <a href={job.apply_link} target="_blank" rel="noopener noreferrer">
    Apply on LinkedIn
  </a>
)}

// Description - only show if available
{job.description && (
  <div>{job.description}</div>
)}
```

### Recommended UI Changes

1. **Company/Location**: Show "Not specified" or hide field if `null`
2. **Apply Link**: Always show if `apply_link` exists, link to LinkedIn
3. **Description**: Hide description section entirely if `null` (don't show "No description available")

## Testing

The API response format has been updated. Test with:
```
GET /scrape-jobs?city=London&max_pages=1
```

All jobs should now have:
- ✅ Proper company names (or null)
- ✅ Proper locations (or null)  
- ✅ Working apply links
- ✅ No "Unknown" or empty string values
