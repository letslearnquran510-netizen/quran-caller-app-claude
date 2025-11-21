# Quran Academy Calling Application

A comprehensive web-based application for managing and automating student calls for Quran Academy. Built with Node.js, Express, and Twilio integration.

## Features

- **Student Management**: Add, edit, and manage student information
- **Automated Calling**: Make individual or bulk calls to students using Twilio
- **Call Scheduling**: Schedule calls with daily, weekly, or monthly repetition
- **Call History**: Track all call activities with detailed logs
- **Real-time Status**: Monitor server connection and call status
- **Responsive UI**: Modern, mobile-friendly interface
- **Data Persistence**: JSON-based local storage for all data

## Prerequisites

Before you begin, ensure you have the following:

- **Node.js** (version 14 or higher)
- **npm** (comes with Node.js)
- **Twilio Account** with:
  - Account SID
  - Auth Token
  - Twilio Phone Number

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd quran-caller-app-claude
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages:
- express
- twilio
- cors
- dotenv
- body-parser
- node-cron

### 3. Configure Environment Variables

The `.env` file already contains your Twilio credentials:

```env
TWILIO_ACCOUNT_SID=AC36c527269be3cb69f42f920d49bd6e7a
TWILIO_AUTH_TOKEN=191bc11f4ed7e4956f5f35130a53b7af
TWILIO_PHONE_NUMBER=+18478606723
```

**IMPORTANT**: Keep this file secure and never commit it to public repositories!

### 4. Start the Server

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Usage

### Accessing the Application

1. Start the server using `npm start`
2. Open your web browser
3. Navigate to `http://localhost:3000`
4. Click "Test Connection" to verify server connectivity

### Managing Students

#### Add a New Student

1. Navigate to "Manage Students" section
2. Click "Add New Student" button
3. Fill in the required information:
   - Student Name (required)
   - Phone Number (required, with country code)
   - Class Level (required)
   - Email (optional)
   - Notes (optional)
4. Click "Save Student"

#### Edit or Delete Students

- In the "Manage Students" section, use the action buttons:
  - Phone icon: Make a call
  - Trash icon: Delete student

### Making Calls

#### Call Individual Student

1. Go to "Call Students" section
2. Find the student you want to call
3. Click the "Call" button
4. Monitor the call status in real-time

#### Call All Students

1. Go to "Call Students" section
2. (Optional) Filter by class level
3. Click "Call All" button
4. Confirm the action
5. The system will call all students with configured intervals

### Scheduling Calls

1. Navigate to "Schedule Calls" section
2. Select one or more students
3. Choose date and time
4. Select repeat option:
   - Once
   - Daily
   - Weekly
   - Monthly
5. Click "Create Schedule"

The scheduler runs automatically and will execute calls at the specified times.

### Viewing Call History

1. Go to "Call History" section
2. View all past calls with:
   - Date & Time
   - Student Name
   - Phone Number
   - Call Status
   - Duration
   - Call ID
3. Use date filters to narrow down results
4. Click "Export" to download history as CSV

## Project Structure

```
quran-caller-app-claude/
├── server.js              # Main server file
├── scheduler.js           # Call scheduling system
├── package.json           # Project dependencies
├── .env                   # Environment variables (Twilio credentials)
├── .gitignore            # Git ignore rules
├── README.md             # This file
├── data/
│   ├── database.js       # JSON database module
│   ├── students.json     # Student records (auto-generated)
│   ├── call-history.json # Call logs (auto-generated)
│   └── schedules.json    # Scheduled calls (auto-generated)
└── public/
    ├── index.html        # Main HTML interface
    ├── css/
    │   └── styles.css    # Application styles
    ├── js/
    │   └── app.js        # Frontend JavaScript
    └── assets/           # Images and other assets
```

## API Endpoints

### Students

- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Add new student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Calls

- `POST /make-call` - Make a call to a student
- `POST /call-status` - Webhook for call status updates

### Call History

- `GET /api/history` - Get all call history
- `GET /api/history/range?startDate=X&endDate=Y` - Get history by date range
- `GET /api/history/student/:studentId` - Get history for a student

### Schedules

- `GET /api/schedules` - Get all schedules
- `GET /api/schedules/:id` - Get schedule by ID
- `POST /api/schedules` - Create new schedule
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule
- `POST /api/schedules/:id/trigger` - Manually trigger a schedule

### System

- `GET /health` - Check server status

## Configuration

### Settings Panel

Access the Settings section to configure:

- **Auto-retry**: Automatically retry failed calls
- **Retry Attempts**: Number of retry attempts (1-5)
- **Call Interval**: Time between bulk calls (10-300 seconds)

Settings are saved locally in the browser.

## Twilio Configuration

The application uses Twilio for making calls. Ensure your Twilio account:

1. Has sufficient balance
2. Has verified phone numbers (for trial accounts)
3. Has proper permissions for making calls

### Testing with Twilio

For testing purposes, the application uses Twilio's demo voice XML:
```
http://demo.twilio.com/docs/voice.xml
```

To customize the message, replace this URL in `server.js` and `scheduler.js` with your own TwiML URL.

## Data Storage

All data is stored locally in JSON files in the `data/` directory:

- **students.json**: Student information
- **call-history.json**: Call logs and records
- **schedules.json**: Scheduled call configurations

The database automatically initializes these files on first run.

## Security Considerations

1. **Environment Variables**: Never commit `.env` file to version control
2. **Phone Numbers**: Always use E.164 format (+[country code][number])
3. **Rate Limiting**: The app includes built-in delays between calls
4. **Twilio Credentials**: Keep your Account SID and Auth Token secure

## Troubleshooting

### Server Won't Start

- Check that port 3000 is not in use
- Verify all dependencies are installed: `npm install`
- Check Node.js version: `node --version` (should be 14+)

### Calls Not Working

- Verify Twilio credentials in `.env`
- Check Twilio account balance
- Ensure phone numbers are in E.164 format
- Check "Test Connection" in the app
- Review server console for error messages

### Connection Issues

- Ensure server is running
- Check browser console for errors
- Verify `API_URL` in `public/js/app.js` matches your server

## Development

### Running in Development Mode

```bash
npm run dev
```

This uses `nodemon` to automatically restart the server on file changes.

### Adding New Features

1. Backend: Add endpoints in `server.js`
2. Database: Add functions in `data/database.js`
3. Frontend: Update `public/js/app.js`
4. UI: Modify `public/index.html` and `public/css/styles.css`

## License

MIT License - Feel free to use and modify for your needs.

## Support

For issues or questions:
1. Check the console logs for error messages
2. Verify Twilio configuration
3. Review the troubleshooting section

## Roadmap

Future enhancements:
- [ ] SMS notifications
- [ ] Custom voice messages
- [ ] Advanced reporting and analytics
- [ ] Multi-language support
- [ ] Database migration to PostgreSQL/MongoDB
- [ ] User authentication
- [ ] Role-based access control
- [ ] API documentation with Swagger
- [ ] Docker containerization

## Credits

Built with:
- [Express.js](https://expressjs.com/) - Web framework
- [Twilio](https://www.twilio.com/) - Communication API
- [Node-cron](https://www.npmjs.com/package/node-cron) - Task scheduling
- [Font Awesome](https://fontawesome.com/) - Icons

---

**Made for Quran Academy with ❤️**
