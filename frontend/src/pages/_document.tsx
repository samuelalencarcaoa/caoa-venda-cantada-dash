import { Head, Html, Main, NextScript } from 'next/document';
import Document from 'next/document';

export default class CustomDocument extends Document {
  render() {
    return (
      <Html lang="pt-BR">
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
