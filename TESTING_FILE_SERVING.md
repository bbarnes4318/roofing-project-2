# Testing File Serving Configuration

This guide helps you verify that your static file serving is working correctly.

## Quick Test Checklist

### 1. Test Uploads Directory Exists
```bash
# SSH into your server and run:
ls -la /var/www/your-app-name/uploads/
ls -la /var/www/your-app-name/uploads/company-assets/
ls -la /var/www/your-app-name/uploads/documents/

# You should see your uploaded files listed
```

### 2. Test File Permissions
```bash
# Check permissions (should be 755 for directories, 644 for files)
ls -la /var/www/your-app-name/uploads/

# If permissions are wrong, fix them:
sudo chmod -R 755 /var/www/your-app-name/uploads/
sudo chown -R www-data:www-data /var/www/your-app-name/uploads/  # NGINX
# OR
sudo chown -R apache:apache /var/www/your-app-name/uploads/      # Apache
# OR
sudo chown -R node:node /var/www/your-app-name/uploads/          # Node.js only
```

### 3. Test Node.js Configuration Endpoint
Visit this URL in your browser or use curl:
```bash
curl https://your-domain.com/api/uploads/test

# Or in browser:
# https://your-domain.com/api/uploads/test
```

Expected response:
```json
{
  "success": true,
  "uploadsConfiguration": {
    "primary": "/path/to/uploads",
    "fallback": "/path/to/fallback",
    "environment": "production",
    "cwd": "/current/working/directory",
    "__dirname": "/server/directory"
  },
  "pathTests": [
    {
      "path": "/path/to/uploads",
      "exists": true,
      "files": ["company-assets", "documents"]
    }
  ]
}
```

### 4. Test Direct File Access
```bash
# Test with curl (should return 200 OK)
curl -I https://your-domain.com/uploads/company-assets/gl_certificate.pdf

# Expected response:
# HTTP/1.1 200 OK
# Content-Type: application/pdf
# Content-Length: [file size]
```

### 5. Test from Browser Console
Open your browser's developer console (F12) and run:
```javascript
// Test file access
fetch('/uploads/company-assets/gl_certificate.pdf')
  .then(response => {
    console.log('✅ Status:', response.status);
    console.log('✅ Content-Type:', response.headers.get('content-type'));
    return response.blob();
  })
  .then(blob => {
    console.log('✅ File size:', blob.size, 'bytes');
    console.log('✅ File type:', blob.type);
  })
  .catch(error => {
    console.error('❌ Error:', error);
  });
```

### 6. Test Upload and Download Flow
1. Upload a test file through your application
2. Check the database to see the `fileUrl` value
3. Try to access that URL directly in the browser
4. Try to download the file using the download button

## Common Issues and Solutions

### Issue: 404 Not Found

**Symptoms:**
- Browser shows "404 Not Found"
- curl returns `HTTP/1.1 404 Not Found`

**Diagnosis:**
```bash
# Check if file exists
ls -la /var/www/your-app-name/uploads/company-assets/gl_certificate.pdf

# Check Node.js logs
sudo journalctl -u your-app-service -n 50

# Check web server logs
sudo tail -f /var/log/nginx/error.log  # NGINX
# OR
sudo tail -f /var/log/apache2/error.log  # Apache
```

**Solutions:**
1. Verify the file exists in the correct location
2. Check that the path in your configuration matches where files are stored
3. Ensure the database `fileUrl` field matches the actual file location
4. Restart your Node.js application: `sudo systemctl restart your-app-service`

### Issue: 403 Forbidden

**Symptoms:**
- Browser shows "403 Forbidden"
- curl returns `HTTP/1.1 403 Forbidden`

**Diagnosis:**
```bash
# Check file permissions
ls -la /var/www/your-app-name/uploads/company-assets/gl_certificate.pdf

# Try to access as the web server user
sudo -u www-data cat /var/www/your-app-name/uploads/company-assets/gl_certificate.pdf  # NGINX
# OR
sudo -u apache cat /var/www/your-app-name/uploads/company-assets/gl_certificate.pdf    # Apache
# OR
sudo -u node cat /var/www/your-app-name/uploads/company-assets/gl_certificate.pdf      # Node.js
```

**Solutions:**
```bash
# Fix permissions
sudo chmod -R 755 /var/www/your-app-name/uploads/
sudo chmod 644 /var/www/your-app-name/uploads/company-assets/*.pdf

# Fix ownership
sudo chown -R www-data:www-data /var/www/your-app-name/uploads/  # NGINX
# OR
sudo chown -R apache:apache /var/www/your-app-name/uploads/      # Apache
# OR
sudo chown -R node:node /var/www/your-app-name/uploads/          # Node.js

# For CentOS/RHEL with SELinux
sudo setenforce 0  # Temporarily disable to test
sudo setsebool -P httpd_read_user_content 1  # Permanent fix
```

### Issue: Works Locally But Not in Production

**Diagnosis:**
```bash
# Compare paths
echo "Local: $(pwd)/server/uploads"
echo "Production: /var/www/your-app-name/uploads"

# Check environment variables
printenv | grep UPLOADS_PATH
printenv | grep NODE_ENV
```

**Solutions:**
1. Set `UPLOADS_PATH` environment variable in production:
   ```bash
   # In Digital Ocean App Platform, add environment variable:
   UPLOADS_PATH=/var/www/your-app-name/uploads
   ```

2. Update your deployment script to copy uploads directory:
   ```bash
   # In your deploy script
   mkdir -p /var/www/your-app-name/uploads/company-assets
   mkdir -p /var/www/your-app-name/uploads/documents
   ```

3. Use absolute paths in production configuration

### Issue: Files Upload But Can't Be Downloaded

**Diagnosis:**
```bash
# Check database fileUrl values
# Connect to your database and run:
SELECT id, title, fileUrl FROM "CompanyAsset" LIMIT 5;

# Check if files exist at those paths
ls -la /var/www/your-app-name/uploads/company-assets/
```

**Solutions:**
1. Ensure upload and download use the same base path
2. Verify `fileUrl` in database matches actual file location
3. Check that the static file serving path matches the upload path

### Issue: CORS Errors

**Symptoms:**
- Browser console shows CORS errors
- "Access to fetch at '...' from origin '...' has been blocked by CORS policy"

**Solutions:**

For Express (already implemented in your code):
```javascript
// In server.js, the static middleware now includes CORS headers
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));
```

For NGINX:
```nginx
location /uploads/ {
    add_header Access-Control-Allow-Origin * always;
}
```

For Apache:
```apache
<Directory /var/www/your-app-name/uploads>
    Header set Access-Control-Allow-Origin "*"
</Directory>
```

## Monitoring and Debugging

### Enable Debug Logging

Add this to your `server.js` to log all file access attempts:
```javascript
app.use('/uploads', (req, res, next) => {
  console.log(`📄 File request: ${req.path}`);
  next();
});
```

### Monitor Logs in Real-Time

```bash
# Node.js application logs
sudo journalctl -u your-app-service -f

# NGINX logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/uploads-access.log
sudo tail -f /var/log/nginx/uploads-error.log

# Apache logs
sudo tail -f /var/log/apache2/access.log  # Debian/Ubuntu
sudo tail -f /var/log/apache2/error.log
sudo tail -f /var/log/httpd/access_log    # CentOS/RHEL
sudo tail -f /var/log/httpd/error_log
```

### Check Server Status

```bash
# Node.js application
sudo systemctl status your-app-service

# NGINX
sudo systemctl status nginx
sudo nginx -t  # Test configuration

# Apache
sudo systemctl status apache2  # Debian/Ubuntu
sudo systemctl status httpd    # CentOS/RHEL
sudo apachectl configtest      # Test configuration
```

## Performance Testing

### Test File Serving Performance
```bash
# Test download speed
time curl -o /dev/null https://your-domain.com/uploads/company-assets/gl_certificate.pdf

# Test with multiple concurrent requests
ab -n 100 -c 10 https://your-domain.com/uploads/company-assets/gl_certificate.pdf
```

### Monitor Resource Usage
```bash
# Check disk space
df -h /var/www/your-app-name/uploads/

# Check disk usage by directory
du -sh /var/www/your-app-name/uploads/*

# Monitor in real-time
watch -n 1 'du -sh /var/www/your-app-name/uploads/*'
```

## Security Checklist

- [ ] Directory listing is disabled
- [ ] Script execution in uploads directory is prevented
- [ ] File permissions are set correctly (755 for dirs, 644 for files)
- [ ] CORS headers are configured appropriately
- [ ] File size limits are enforced
- [ ] File type validation is implemented
- [ ] Uploaded files are scanned for malware (if applicable)
- [ ] SSL/HTTPS is enabled in production
- [ ] Security headers are set (X-Content-Type-Options, X-Frame-Options)

## Next Steps

After verifying file serving works:

1. **Set up automated backups** for the uploads directory
2. **Configure log rotation** to prevent disk space issues
3. **Set up monitoring** to alert on file serving errors
4. **Document the deployment process** for your team
5. **Test disaster recovery** by restoring from backup

## Getting Help

If you're still experiencing issues:

1. Check the main configuration guide: `STATIC_FILE_SERVING_CONFIGURATION.md`
2. Review server logs for specific error messages
3. Test with the `/api/uploads/test` endpoint
4. Verify all paths and permissions are correct
5. Ensure environment variables are set in production

