import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="ru">
      <Head>
        <meta name="theme-color" content="#f5f5f7" id="theme-color-meta"/>
        <meta name="color-scheme" content="light dark"/>
        <style dangerouslySetInnerHTML={{__html:`
          html,body{background-color:#f5f5f7;}
          html.dark,body.dark{background-color:#111111;}
        `}}/>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
