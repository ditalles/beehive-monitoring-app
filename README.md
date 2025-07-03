HeilooHive: Beehive Monitoring Application
HeilooHive is a web application designed for real-time monitoring of beehive health and activity. It integrates with ThingSpeak to acquire sensor data, providing critical insights into parameters such as hive weight, internal and external temperatures, humidity, and battery voltage. The application features a structured dashboard, detailed hive analytics, and a system for identifying potential swarm risks and assessing colony health.

HeilooHive provides beekeepers with data-driven insights to support informed decision-making regarding hive management.

Core Features
User Access: A streamlined login interface provides access to the application dashboard. A demo mode is available for immediate exploration without external credentials.

ThingSpeak Integration: Direct connection to ThingSpeak channels enables the retrieval of live beehive sensor data using a Channel ID and Read API Key.

Data Fallback Mechanism: In the absence of valid ThingSpeak credentials or successful data retrieval, the system defaults to simulated data, ensuring continuous functionality for demonstration or testing purposes.

Dashboard Overview:

Presents a consolidated list of configured hives.

Displays the latest sensor readings for each hive.

Highlights hives associated with unread alerts.

Facilitates direct navigation to detailed analytics for individual hives.

Advanced Hive Analytics:

Data Source Indicator: Clearly identifies the origin of displayed data (live ThingSpeak, simulated demo, or fallback).

Colony Health Score: Calculates and presents a health score derived from brood temperature stability, weight trends, and humidity levels.

Swarm Risk Assessment: Analyzes recent data to detect indicators of potential swarming behavior, enabling proactive intervention.

Honey Flow Analysis: Tracks weight fluctuations over time to estimate honey production periods and efficiency.

Interactive Data Visualization: Provides historical data visualization for various sensors (weight, temperatures, humidity, battery voltage) across user-selected timeframes (24 hours, 3 days, 7 days, 30 days).

Sensor Statistics: Presents minimum, maximum, and average values for selected sensor data.

Proactive Alert System: Manages and displays alerts triggered by significant deviations in hive data (e.g., substantial weight loss, critical temperature variations).

Responsive Design: Developed with Tailwind CSS to ensure optimal display and functionality across diverse devices (mobile, tablet, desktop).

Configuration Management: A dedicated Settings interface allows for the addition, modification, or removal of hive configurations.

Technical Stack
HeilooHive is built upon the following modern web technologies:

React: Utilized for constructing the dynamic and interactive user interface.

Recharts: Employed for generating data visualizations and charts.

Tailwind CSS: Provides a utility-first CSS framework for efficient and responsive design implementation.

ThingSpeak API: Serves as the interface for fetching real-time sensor data from IoT devices.

Getting Started
To deploy and operate this application locally, follow these instructions:

Prerequisites
Ensure the following software is installed:

Node.js: (LTS version recommended)

npm (Node Package Manager) or Yarn

Installation and Execution
React Project Setup (if applicable):
(Note: This guide assumes integration into an existing or new React project environment, e.g., initialized with create-react-app or Vite.)

# Example: Initializing with Create React App
npx create-react-app heiloo-hive
cd heiloo-hive
# Integrate HeilooHive component code into a relevant file (e.g., src/App.js)

Dependency Installation:
Navigate to the project directory in your terminal and execute:

npm install recharts
# or
yarn add recharts

(If Tailwind CSS is not yet configured, refer to its official React installation documentation.)

Application Launch:

npm start
# or
yarn start

The HeilooHive dashboard will typically become accessible in your web browser at http://localhost:3000.

Configuration: Connecting to Hive Data
Upon initial launch, the login screen will be presented.

Demo Mode (Default):

Username: demo_user

ThingSpeak Channel ID: 123456

ThingSpeak Read API Key: demo_api_key

This configuration enables immediate access to all application features using simulated data, negating the requirement for a ThingSpeak account.

Live Data Mode:
To establish a connection with your ThingSpeak-enabled beehive sensors:

Enter the desired Username.

Provide your ThingSpeak Channel ID.

Input your ThingSpeak Read API Key.

Initiate login via the "Login" button.

HeilooHive will then attempt to retrieve live data from the specified ThingSpeak channel. In cases of failed data retrieval (e.g., incorrect credentials, network issues), the application will automatically revert to using simulated data, ensuring uninterrupted operation.

Usage Workflow
Login: Access the application using either demo or ThingSpeak credentials.

Dashboard – Apiary Overview:

Review a summary of all configured hives and their current sensor readings.

Monitor the "Alerts" indicator for unread notifications.

Select any hive card to access its detailed analytics.

Utilize the "Settings" button (located at the bottom right) for hive configuration management.

Hive Detail Page – In-depth Analysis:

Navigate between "Overview," "Charts," and "Honey Flow" tabs for varied data perspectives.

Within the "Charts" tab, select specific sensors and timeframes to visualize historical trends.

Review the calculated "Colony Health Score" and "Swarm Risk Assessment."

Analyze the "Honey Flow" section to understand production cycles and potential yield.

Alerts – Notification Management:

Unread alerts are prominently displayed on the dashboard and within a dedicated modal.

Alerts can be marked as read upon review.

Future Development Roadmap
Ongoing development aims to enhance HeilooHive with the following capabilities:

Long-Term Data Persistence: Integration with a persistent database (e.g., Firebase Firestore) to store historical data beyond ThingSpeak's retention limits, enabling more extensive long-term analysis.

Customizable Alert Thresholds: Implementation of user-definable thresholds for alert generation (e.g., weight drop exceeding a specified value within a defined period).

Multi-Apiary Management: Enhanced features for managing multiple apiaries and hive groupings.

Predictive Analytics: Integration of advanced models for predicting future hive behavior (e.g., swarm probability, disease risk).

User Profile and Preferences: Functionality for users to customize dashboard layouts and notification settings.

Data Export Capabilities: Generation of exportable reports (e.g., PDF, CSV) containing hive data and analytical summaries.

This application aims to support beekeepers in achieving more efficient and informed hive management.