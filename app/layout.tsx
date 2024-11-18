// app/layout.tsx

import { ThemeProvider } from "../src/components/theme-provider"

import "../styles/globals.css"; 

export const metadata: Metadata = {
  title: 'dotChart',
  description: 'Stock chart application',
}


export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <head />
        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </body>
      </html>
    </>
  )
}
