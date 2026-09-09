import "~/styles/globals.css";

import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "T3 Starter",
  description: "",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <ClerkProvider>
          <TRPCReactProvider>
            <header className="flex h-16 items-center justify-end gap-3 border-b px-6">
              <Show when="signed-out">
                <SignInButton>
                  <button className="cursor-pointer rounded-md px-3 py-2 text-sm font-medium">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton>
                  <button className="cursor-pointer rounded-md bg-black px-3 py-2 text-sm font-medium text-white">
                    Sign up
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </header>
            {children}
          </TRPCReactProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
