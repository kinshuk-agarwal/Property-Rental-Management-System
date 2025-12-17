const { query } = require('../db/connection');
const { sendEmail } = require('./email');

// Send notification function (both in-app and email)
const sendNotification = async (userId, title, message, options = {}) => {
  try {
    // Insert notification into database
    await query(
      'INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)',
      [userId, title, message]
    );

    // Send email if user has email configured
    if (options.sendEmail !== false) {
      try {
        // Get user email from database (assuming we need to add email field or use existing)
        // For now, we'll skip email sending if no email is configured
        // In a real implementation, you'd fetch the user's email from the database

        // const userResult = await query('SELECT email FROM users WHERE aadhar = $1', [userId]);
        // if (userResult.rows.length > 0 && userResult.rows[0].email) {
        //   const emailHtml = `
        //     <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        //       <h2 style="color: #333;">${title}</h2>
        //       <p style="color: #666; line-height: 1.6;">${message}</p>
        //       <hr style="border: none; border-top: 1px solid #eee;">
        //       <p style="color: #999; font-size: 12px;">
        //         This is an automated message from Property Rental System.
        //       </p>
        //     </div>
        //   `;
        //   await sendEmail(userResult.rows[0].email, title, emailHtml);
        // }

        console.log(`Notification email would be sent to user ${userId}: ${title}`);
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
        // Don't fail the whole notification if email fails
      }
    }

    console.log(`Notification sent to user ${userId}: ${title}`);
  } catch (error) {
    console.error('Failed to send notification:', error);
    throw error;
  }
};

// Get user email from database (helper function for future email integration)
const getUserEmail = async (userId) => {
  try {
    // This would be implemented when email field is added to users table
    // For now, return null
    return null;
  } catch (error) {
    console.error('Failed to get user email:', error);
    return null;
  }
};

module.exports = {
  sendNotification,
  getUserEmail
};


