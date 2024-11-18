# DotChart

**DotChart** is a Next.js web application designed to simplify the process of viewing stock charts for 750 stocks listed on the **National Stock Exchange (NSE), India**. The app organizes stocks into five indices, allowing users to quickly browse through charts and monitor market trends.

## Features

- **Index-Based Navigation:** View charts for stocks from the following indices:
  - Nifty 50
  - Nifty Next 50
  - Midcap 150
  - Smallcap 250
  - Microcap 250
- **Simple Chart Navigation:** 
  - Select an index to load stock charts.
  - Use the **Next** button to cycle through stock charts, making it easier to analyze multiple stocks.
- **Mobile-First Design:** Optimized for viewing on both desktop and mobile devices.
- **Future Enhancements:** Continuous improvements and additional features will be added in future updates.

## Installation

Follow these steps to get **DotChart** running locally:

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/dotchart.git
   cd dotchart
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Deployment

This project is ready for deployment on platforms like Vercel or Netlify. Follow their respective guides to deploy your Next.js app.

## Usage

1. Select an index from the list on the homepage.
2. The chart for the first stock in the selected index will load automatically.
3. Press the **Next** button to view the next stock in the index.

## Tech Stack

- **Frontend Framework:** [Next.js](https://nextjs.org/)
- **Charting Library:** [Lightweight Charts](https://tradingview.github.io/lightweight-charts/)
- **CSS Framework:** Tailwind CSS (for styling)

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to improve **DotChart**.

## License

This project is licensed under the [MIT License](LICENSE).

---

**DotChart** is under active development, and your feedback is invaluable. If you encounter any issues or have suggestions for new features, please open an issue on GitHub.
