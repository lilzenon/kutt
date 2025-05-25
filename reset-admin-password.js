const bcrypt = require('bcryptjs');
const knex = require('./server/knex');

async function resetAdminPassword() {
  try {
    const newPassword = 'admin123456'; // Change this to your desired password
    console.log('Setting new password for admin user...');
    
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    const result = await knex('users')
      .where({ email: 'info@bounce2bounce.com' })
      .update({ 
        password: hashedPassword,
        verified: true 
      });
    
    if (result > 0) {
      console.log('✅ Password updated successfully!');
      console.log('Email: info@bounce2bounce.com');
      console.log('Password:', newPassword);
      console.log('');
      console.log('You can now log in at http://localhost:3000/login');
    } else {
      console.log('❌ No user found with that email');
    }
    
    await knex.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error updating password:', error.message);
    await knex.destroy();
    process.exit(1);
  }
}

resetAdminPassword();
