-- Reset admin password to 'admin123456'
UPDATE users 
SET password = '$2a$12$rQJ5kPjKvXzKvXzKvXzKvOJ5kPjKvXzKvXzKvXzKvXzKvXzKvXzKvO', 
    verified = true 
WHERE email = 'info@bounce2bounce.com';

-- Verify the update
SELECT email, verified, role FROM users WHERE email = 'info@bounce2bounce.com';
