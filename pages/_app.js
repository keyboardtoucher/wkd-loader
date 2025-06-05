// pages/_app.js
import '../loader.css'  // Импорт CSS из корня

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />
}