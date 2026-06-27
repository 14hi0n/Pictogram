<div align="center">
  <img src="public/icons/icon_48.png" width="64">
  <h1>Pictogram</h1>
  <p>Chrome extension for sharing anime art to Telegram channels</p>
</div>

---

Pictogram is a Chrome browser extension designed to make sharing anime art to Telegram channels seamless and efficient. With just one click, you can send your favorite anime art from supported websites directly to a Telegram channel. Perfect for administrators who manage anime-related channels.

## ⚠️ Disclaimer: Early Development Stage

<br>
<div align="center">
    <img width="500" align="center" src="./assets/example.v0.2.2.gif">
    <br><br>
    <a href="https://github.com/14hi0n/Pictogram/releases/latest" target="_blank"><b>DOWNLOAD LATEST VERSION</b></a>
</div>
<br>

---

## 🌟 Features

-   **Quick and Easy Setup**: Integrate your Telegram bot in just a few steps.
-   **One-Click Forwarding**: Instantly share art to your Telegram channel using a simple interface.
-   **Website Compatibility**: Supports popular anime art websites.
-   **User Notifications**: Get feedback directly in your browser about successful actions.

---

## 🔧 Supported Websites

-   Danbooru
-   Pixiv
-   ZeroChan

---

## 🚀 Roadmap: Upcoming Features

Here are some planned features currently in development:

-   [ ] Image grouping
-   [ ] Displaying notifications
-   [ ] UI improvements
-   [ ] Support for multiple Chat IDs
-   [ ] Adding custom descriptions to posts
-   [ ] Ability to disable automatic hashtags
-   [ ] Editing hashtags directly in the extension

---

## 📌 How to Use

1. **Download the latest version** from the [Releases](https://github.com/14hi0n/Pictogram/releases/latest) page.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" (toggle in the top-right corner).
4. Click "Load unpacked" and select the `build` folder of the extension.
5. Configure the extension with your Telegram bot's token and channel chat ID.
6. Start forwarding anime art with just one click!

---

## 💻 For Developers

### Getting Started

1. **Clone the repository**:

    ```sh
    git clone https://github.com/14hi0n/Pictogram.git
    ```

2. **Navigate to the project directory**:

    ```sh
    cd Pictogram
    ```

3. **Install dependencies**:
    ```sh
    npm install
    ```

---

### 📦 Available Scripts

-   **Development**:

    ```sh
    npm run watch
    ```

    Starts a watcher that tracks file changes and automatically rebuilds the project.

-   **Production Build**:

    ```sh
    npm run build
    ```

    Compiles the app for production into the `build` folder.

-   **Packaging**:

    ```sh
    npm run pack
    ```

    Packs the build folder into a `.zip` file located in the `release` folder.

-   **Repackaging**:

    ```sh
    npm run repack
    ```

    Cleans and repackages the project from scratch.

-   **Code Formatting**:
    ```sh
    npm run format
    ```
    Formats all HTML, CSS, JavaScript, TypeScript, and JSON files for consistency.

---

## 🛠 Contribution Guidelines

Feel free to contribute to the project by opening issues or submitting pull requests. Make sure to follow the [Code of Conduct](CODE_OF_CONDUCT.md) and include clear explanations for your changes.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---

## 🙌 Acknowledgements

Special thanks to:

-   [Vue.js](https://vuejs.org) for making the extension reactive and intuitive.
-   The awesome anime art community for inspiration.