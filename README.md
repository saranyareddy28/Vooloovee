# Vooloovee

Updated project branding and real email flow for **Vooloovee**.

## What changed

- New users get a verification email sent to their email address.
- Forgot/reset password sends a secure reset link to the user's email address.
- The sender account is set as **vooloovee@gmail.com**.
- Email verification now sends a 6-digit OTP. Entering the correct OTP marks the account as Verified in the brand user list.
- Email sending runs through the Node backend using Gmail + Nodemailer.

## Important

A normal static HTML file cannot send real Gmail by itself. To send real emails from **vooloovee@gmail.com**, run this project with the included Node server and add a Google App Password for that Gmail account.

## Setup steps

1. Open the project folder in VS Code.
2. Open terminal inside the project folder.
3. Run:

```bash
npm install
```

4. Copy `.env.example` and rename the copy to `.env`.
5. In `.env`, keep:

```env
GMAIL_USER=vooloovee@gmail.com
```

6. Add the Gmail App Password:

```env
GMAIL_APP_PASSWORD=your_16_character_google_app_password
```

7. Run:

```bash
npm start
```

8. Open:

```text
http://localhost:3000
```

Now verification and reset password emails will be sent from **vooloovee@gmail.com** to the user's email.

## How to create a Gmail App Password

In the **vooloovee@gmail.com** Google account:

1. Turn on 2-Step Verification.
2. Go to Google Account → Security → App passwords.
3. Create an app password for Mail.
4. Copy the 16-character password into `.env`.

Never put your normal Gmail password in the project.


## For real users online

If you deploy this website, open it from the deployed backend URL, not by double-clicking `index.html`. The email link uses the current website URL, so for real users it should look like your live website link, not `localhost`.

For deployment, add these environment variables in the hosting dashboard:

```env
GMAIL_USER=vooloovee@gmail.com
GMAIL_APP_PASSWORD=your_16_character_google_app_password
```

Do not upload the `.env` file to GitHub. Keep only `.env.example` in GitHub.

Latest update:
- Forgot Password now sends a reset link and updates the saved user password.
- After password update, the Brand > Users list will show the new password when the View button is clicked.
- Email verification and password reset screens now use a cleaner professional status-card style.
