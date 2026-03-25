# Static File Serving Configuration Guide

## Problem Summary
Uploaded documents return 404 errors when accessed directly via URLs like:
```
https://[your-domain].com/uploads/company-assets/gl_certificate.pdf
```

The backend API correctly returns relative URLs (e.g., `/uploads/company-assets/gl_certificate.pdf`), but the web server is not serving these static files properly.

---

## Solution 1: Node.js with Express (YOUR CURRENT SETUP)

### Current Configuration
Your Express server already has static file serving configured in `server/server.js` (lines 706-708):

```javascript
// Serve uploaded files (documents, company assets) safely
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Also serve uploads from the repository root if present (fallback)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
```

### Issue Diagnosis
The configuration is correct, but the issue may be:

1. **Production Path Mismatch**: In production (Digital Ocean), the physical file path may differ
2. **Build/Deploy Process**: The `uploads` directory may not be copied to the production server
3. **File Permissions**: The Node.js process may not have read permissions

### Recommended Fixes

#### Fix 1: Verify and Update Production Paths
Add this enhanced configuration to `server/server.js` (replace lines 705-708):

```javascript
// ============================================================================
// STATIC FILE SERVING CONFIGURATION
// ============================================================================
// Serve uploaded files (documents, company assets) safely
// NOTE: Adjust the physical path based on your deployment environment

const uploadsPath = process.env.UPLOADS_PATH || path.join(__dirname, 'uploads');

// Log the uploads directory for debugging
console.log('📁 Uploads directory:', uploadsPath);
console.log('📁 Uploads exists:', fs.existsSync(uploadsPath));

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsPath, {
  // Enable directory listing in development only
  index: false,
  // Set cache headers for better performance
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  // Handle errors gracefully
  fallthrough: true,
  // Set proper headers
  setHeaders: (res, filePath) => {
    // Allow CORS for uploaded files
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Prevent directory listing
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// Fallback: Also serve uploads from the repository root if present
const rootUploadsPath = path.join(__dirname, '..', 'uploads');
if (fs.existsSync(rootUploadsPath) && rootUploadsPath !== uploadsPath) {
  console.log('📁 Fallback uploads directory:', rootUploadsPath);
  app.use('/uploads', express.static(rootUploadsPath, {
    index: false,
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    fallthrough: true
  }));
}

// Add a test endpoint to verify file serving
app.get('/api/uploads/test', (req, res) => {
  const fs = require('fs');
  const testPaths = [
    uploadsPath,
    rootUploadsPath,
    '/var/www/uploads',
    path.join(process.cwd(), 'uploads')
  ];
  
  const results = testPaths.map(p => ({
    path: p,
    exists: fs.existsSync(p),
    files: fs.existsSync(p) ? fs.readdirSync(p).slice(0, 5) : []
  }));
  
  res.json({
    success: true,
    uploadsConfiguration: {
      primary: uploadsPath,
      fallback: rootUploadsPath,
      environment: process.env.NODE_ENV,
      cwd: process.cwd(),
      __dirname: __dirname
    },
    pathTests: results
  });
});
```

#### Fix 2: Add Environment Variable for Production
In your Digital Ocean deployment, set the `UPLOADS_PATH` environment variable:

```bash
# For Digital Ocean App Platform, add this environment variable:
UPLOADS_PATH=/var/www/your-app-name/uploads

# Or if using Docker:
UPLOADS_PATH=/app/uploads
```

#### Fix 3: Ensure Uploads Directory Exists in Production
Add this to your deployment script or Dockerfile:

```bash
# Create uploads directory structure
mkdir -p /var/www/your-app-name/uploads/company-assets
mkdir -p /var/www/your-app-name/uploads/documents

# Set proper permissions (adjust user/group as needed)
chown -R node:node /var/www/your-app-name/uploads
chmod -R 755 /var/www/your-app-name/uploads
```

#### Fix 4: Add Startup Verification
Add this to the top of your `server/server.js` file (after line 54):

```javascript
// Verify uploads directory exists and is writable
const uploadsDir = path.join(__dirname, 'uploads');
const companyAssetsDir = path.join(uploadsDir, 'company-assets');
const documentsDir = path.join(uploadsDir, 'documents');

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Created uploads directory:', uploadsDir);
  }
  if (!fs.existsSync(companyAssetsDir)) {
    fs.mkdirSync(companyAssetsDir, { recursive: true });
    console.log('✅ Created company-assets directory:', companyAssetsDir);
  }
  if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
    console.log('✅ Created documents directory:', documentsDir);
  }
  
  // Test write permissions
  const testFile = path.join(uploadsDir, '.write-test');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log('✅ Uploads directory is writable');
} catch (error) {
  console.error('❌ Uploads directory error:', error.message);
  console.error('❌ This may cause file upload/serving issues');
}
```

---

## Solution 2: NGINX Configuration

If you're using NGINX as a reverse proxy in front of your Node.js application (common on Digital Ocean), add this to your NGINX configuration:

```nginx
# /etc/nginx/sites-available/your-app-name
# or /etc/nginx/conf.d/your-app-name.conf

server {
    listen 80;
    server_name your-domain.com;

    # Maximum upload size
    client_max_body_size 50M;

    # Serve static uploaded files directly (bypasses Node.js for better performance)
    location /uploads/ {
        # IMPORTANT: Replace this path with your actual uploads directory
        # Common paths:
        # - /var/www/your-app-name/uploads
        # - /home/deploy/your-app-name/uploads
        # - /app/uploads (if using Docker)
        alias /var/www/your-app-name/uploads/;
        
        # Enable CORS for uploaded files
        add_header Access-Control-Allow-Origin *;
        
        # Cache uploaded files for 1 day
        expires 1d;
        add_header Cache-Control "public, immutable";
        
        # Security headers
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options SAMEORIGIN;
        
        # Disable directory listing
        autoindex off;
        
        # Try to serve the file, return 404 if not found
        try_files $uri =404;
        
        # Log access for debugging
        access_log /var/log/nginx/uploads-access.log;
        error_log /var/log/nginx/uploads-error.log;
    }

    # Proxy all other requests to Node.js
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**After adding this configuration:**
```bash
# Test NGINX configuration
sudo nginx -t

# Reload NGINX
sudo systemctl reload nginx

# Check NGINX error logs if issues persist
sudo tail -f /var/log/nginx/error.log
```

---

## Solution 3: Apache Configuration

If you're using Apache as a reverse proxy (less common but possible):

```apache
# /etc/apache2/sites-available/your-app-name.conf
# or /etc/httpd/conf.d/your-app-name.conf

<VirtualHost *:80>
    ServerName your-domain.com
    
    # Enable required modules (run these commands first):
    # sudo a2enmod proxy proxy_http headers expires rewrite
    
    # Serve static uploaded files directly
    # IMPORTANT: Replace this path with your actual uploads directory
    Alias /uploads /var/www/your-app-name/uploads
    
    <Directory /var/www/your-app-name/uploads>
        # Allow access to this directory
        Require all granted
        
        # Disable directory listing
        Options -Indexes +FollowSymLinks
        
        # Enable CORS
        Header set Access-Control-Allow-Origin "*"
        
        # Cache uploaded files for 1 day
        ExpiresActive On
        ExpiresDefault "access plus 1 day"
        Header set Cache-Control "public, immutable"
        
        # Security headers
        Header set X-Content-Type-Options "nosniff"
        Header set X-Frame-Options "SAMEORIGIN"
        
        # Prevent execution of scripts in uploads directory
        <FilesMatch "\.(php|phtml|php3|php4|php5|pl|py|jsp|asp|sh|cgi)$">
            Require all denied
        </FilesMatch>
    </Directory>
    
    # Proxy all other requests to Node.js
    ProxyPreserveHost On
    ProxyPass /uploads !
    ProxyPass / http://localhost:5000/
    ProxyPassReverse / http://localhost:5000/
    
    # WebSocket support (for Socket.io)
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*)           ws://localhost:5000/$1 [P,L]
    
    # Error logging
    ErrorLog ${APACHE_LOG_DIR}/your-app-error.log
    CustomLog ${APACHE_LOG_DIR}/your-app-access.log combined
</VirtualHost>
```

**After adding this configuration:**
```bash
# Enable required Apache modules
sudo a2enmod proxy proxy_http headers expires rewrite

# Test Apache configuration
sudo apachectl configtest

# Reload Apache
sudo systemctl reload apache2  # Debian/Ubuntu
# OR
sudo systemctl reload httpd    # CentOS/RHEL

# Check Apache error logs if issues persist
sudo tail -f /var/log/apache2/error.log  # Debian/Ubuntu
# OR
sudo tail -f /var/log/httpd/error_log    # CentOS/RHEL
```

---

## Testing Your Configuration

### 1. Test File Access Directly
```bash
# SSH into your server and test file access
ls -la /var/www/your-app-name/uploads/company-assets/
cat /var/www/your-app-name/uploads/company-assets/gl_certificate.pdf
```

### 2. Test HTTP Access
```bash
# Test from command line
curl -I https://your-domain.com/uploads/company-assets/gl_certificate.pdf

# Should return:
# HTTP/1.1 200 OK
# Content-Type: application/pdf
```

### 3. Test from Browser
Open your browser's developer console and run:
```javascript
fetch('/uploads/company-assets/gl_certificate.pdf')
  .then(response => {
    console.log('Status:', response.status);
    console.log('Headers:', [...response.headers]);
    return response.blob();
  })
  .then(blob => console.log('File size:', blob.size))
  .catch(error => console.error('Error:', error));
```

### 4. Use the Test Endpoint
After implementing Fix 1, visit:
```
https://your-domain.com/api/uploads/test
```

This will show you all the paths being checked and which files are found.

---

## Common Issues and Solutions

### Issue 1: 404 Not Found
**Cause**: File doesn't exist or path is incorrect
**Solution**: 
- Verify file exists: `ls -la /path/to/uploads/company-assets/`
- Check the database `fileUrl` field matches the actual file location
- Ensure the path in your configuration matches where files are actually stored

### Issue 2: 403 Forbidden
**Cause**: Permission issues
**Solution**:
```bash
# Fix permissions
sudo chown -R www-data:www-data /var/www/your-app-name/uploads  # NGINX
sudo chown -R apache:apache /var/www/your-app-name/uploads      # Apache
sudo chown -R node:node /var/www/your-app-name/uploads          # Node.js only

# Fix file permissions
sudo chmod -R 755 /var/www/your-app-name/uploads
```

### Issue 3: Files Upload But Can't Be Downloaded
**Cause**: Uploads directory changes between upload and download
**Solution**: Use environment variable to ensure consistent paths

### Issue 4: Works Locally But Not in Production
**Cause**: Different directory structure in production
**Solution**: 
- Add logging to see actual paths being used
- Use the test endpoint to diagnose
- Set `UPLOADS_PATH` environment variable explicitly

---

## Recommended Approach for Your Setup

Since you're using **Node.js with Express on Digital Ocean**, I recommend:

1. **Implement Fix 1** (Enhanced Express configuration with logging)
2. **Add Fix 4** (Startup verification)
3. **Set the `UPLOADS_PATH` environment variable** in Digital Ocean
4. **Test using the `/api/uploads/test` endpoint**
5. **If using NGINX** (likely on Digital Ocean), also implement Solution 2

This will give you robust file serving with proper error handling and debugging capabilities.

