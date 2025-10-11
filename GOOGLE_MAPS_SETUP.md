# Google Maps API Setup Guide

## Overview
This application now includes Google Maps autocomplete integration for all address fields throughout the application, including the Bubbles AI page.

## Setup Instructions

### 1. Get Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Places API** (for autocomplete functionality)
   - **Maps JavaScript API** (for map functionality)
4. Go to "Credentials" and create a new API key
5. Restrict the API key to your domain for security

### 2. Environment Variables
Add the following environment variable to your `.env` file:

```bash
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 3. Production Environment
For production deployment on DigitalOcean, add the environment variable to your app configuration:

```yaml
envs:
- key: REACT_APP_GOOGLE_MAPS_API_KEY
  value: your_google_maps_api_key_here
```

## Features Implemented

### Address Fields with Google Maps Autocomplete:
- ✅ **Add Project Modal** - Project address field
- ✅ **Project Profile Page** - Project address field  
- ✅ **Project Profile Tab** - Editable project address
- ✅ **Settings Page** - Company address field
- ✅ **Bubbles AI Page** - Address context in conversations

### Google Maps Autocomplete Features:
- **US Address Restriction** - Only shows US addresses
- **Real-time Suggestions** - As you type, Google provides address suggestions
- **Formatted Addresses** - Ensures consistent address formatting
- **Error Handling** - Graceful fallback if API key is missing
- **Loading States** - Visual indicators during API loading
- **Accessibility** - Proper ARIA labels and keyboard navigation

## Usage

### In Components:
```jsx
import GoogleMapsAutocomplete from '../ui/GoogleMapsAutocomplete';

<GoogleMapsAutocomplete
  name="address"
  value={address}
  onChange={handleAddressChange}
  placeholder="Enter address"
  required
/>
```

### In Bubbles AI:
The Bubbles AI assistant can now understand and work with addresses mentioned in conversations, providing better context for project-related queries.

## Security Notes
- API key is restricted to your domain
- Only Places API and Maps JavaScript API are enabled
- No sensitive data is stored or transmitted to Google
- Address data is only used for autocomplete suggestions

## Troubleshooting

### Common Issues:
1. **"Google Maps API key not configured"** - Add REACT_APP_GOOGLE_MAPS_API_KEY to your .env file
2. **"Failed to load Google Maps API"** - Check your API key and ensure Places API is enabled
3. **No suggestions appearing** - Verify the API key has Places API enabled and is not restricted too much

### Testing:
- Test in development with a valid API key
- Verify autocomplete works for various US addresses
- Check that error handling works when API key is missing
