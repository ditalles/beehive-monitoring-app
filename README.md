# 🐝 HeilooHive: Beehive Monitoring Application

**HeilooHive** is a modern web app for real-time monitoring of beehive health and activity. It seamlessly integrates with [ThingSpeak](https://thingspeak.com/) to collect sensor data, providing critical insights for beekeepers.

---

## Table of Contents

- [Core Features](#-core-features)
- [How to Use on Your Phone](#-how-to-use-the-app-on-your-phone)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Configuration](#-configuration-connecting-to-hive-data)
- [Usage Workflow](#-usage-workflow)
- [Our Mission](#-our-mission)

---

## 🚀 Core Features

- **🔑 User Access:** Simple login with demo mode for instant exploration—no credentials required.
- **📡 ThingSpeak Integration:** Connect to live hive sensors using your Channel ID and Read API Key.
- **🛡️ Data Fallback:** Automatic switch to simulated/demo data if ThingSpeak access fails, ensuring the app always works.
- **📊 Dashboard Overview:**  
  - View all configured hives at a glance  
  - See latest sensor data  
  - Visual alert indicators for unread notifications  
  - Quick navigation to detailed analytics  
- **📈 Advanced Hive Analytics:**  
  - **Data Source Indicator**: See if data is live or simulated  
  - **Colony Health Score**: Aggregated from temperature, weight, and humidity  
  - **Swarm Risk Assessment**: Early warnings for proactive action  
  - **Honey Flow Analysis**: Track honey yield trends  
  - **Interactive Charts**: Explore historical sensor data by timeframe  
  - **Sensor Statistics**: Min, max, and averages for all metrics  
- **🚨 Proactive Alert System:** Get notified of sudden changes (e.g., weight loss, temperature spikes).
- **📱 Responsive Design:** Built with Tailwind CSS for perfect viewing on mobile, tablet, and desktop.

---

## 📱 How to Use the App on Your Phone

The Beehive Monitoring App runs entirely in your browser and does not require installation from an app store.

### To use on your phone:
1. Open your preferred mobile browser (such as Chrome or Safari).
2. Go to [https://ditalles.github.io/beehive-monitoring-app/](https://ditalles.github.io/beehive-monitoring-app/).
3. You can use the app directly in your browser.

### (Optional) Add the App to Your Home Screen

If you want quicker access and an app-like experience, you can add the Beehive Monitoring App to your phone’s home screen:

- **On Android (Chrome):**
  1. Open the app in Chrome.
  2. Tap the menu (three dots) in the top right.
  3. Select “Add to Home screen.”
  4. Follow the prompts to add.

- **On iPhone (Safari):**
  1. Open the app in Safari.
  2. Tap the Share icon (square with arrow).
  3. Select “Add to Home Screen.”
  4. Follow the prompts to add.

This will create a shortcut icon that launches the app in its own window, just like a native app.

---

## 🛠️ Tech Stack

- **React**: Dynamic user interface
- **Recharts**: Beautiful data visualizations
- **Tailwind CSS**: Fast, responsive styling
- **ThingSpeak API**: Real-time IoT data integration

---

## 🏁 Getting Started

### Prerequisites

- **Node.js** (LTS version recommended)
- **npm** or **Yarn**

### Installation

1. **Initialize your React project** (if you haven’t already):

    ```sh
    npx create-react-app heiloo-hive
    cd heiloo-hive
    # Add the HeilooHive code to your src directory
    ```

2. **Install dependencies:**

    ```sh
    npm install recharts
    # or
    yarn add recharts
    ```

    > If you haven’t set up Tailwind CSS, follow their [React installation guide](https://tailwindcss.com/docs/guides/create-react-app).

3. **Start the application:**

    ```sh
    npm start
    # or
    yarn start
    ```

    Access the dashboard at [http://localhost:3000](http://localhost:3000).

---

## 🔗 Configuration: Connecting to Hive Data

- **Demo Mode** (default, no ThingSpeak account needed):
    - **Username:** `demo_user`
    - **Channel ID:** `123456`
    - **API Key:** `demo_api_key`
- **Live Data Mode**:  
    - Enter your own credentials to connect to your ThingSpeak-enabled hives.

*If data retrieval fails (e.g., invalid credentials), the app will automatically fall back to demo data.*

---

## 🐝 Usage Workflow

1. **Login:** Use either demo or ThingSpeak credentials.
2. **Dashboard:**  
    - Review all hives and current sensor data
    - Monitor alerts
    - Click a hive for detailed analytics
    - Use Settings (bottom right) to manage hives
3. **Hive Details:**  
    - Switch between Overview, Charts, and Honey Flow tabs
    - Visualize trends and historical data
    - Check Colony Health and Swarm Risk assessments
4. **Alerts:**  
    - Dashboard and modal highlight unread alerts
    - Mark alerts as read after review

---

## 💡 Our Mission

HeilooHive empowers beekeepers with actionable insights, supporting smarter, more efficient hive management—so your bees thrive!

---

> *Questions, suggestions, or want to contribute? Open an issue or pull request!*
