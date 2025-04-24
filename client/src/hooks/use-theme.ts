import { useState, useEffect } from "react";

export function useTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">(
    () => (localStorage.getItem("theme") as "light" | "dark") || 
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return {
    theme,
    setTheme: (newTheme: "light" | "dark") => setThemeState(newTheme),
    toggleTheme: () => setThemeState(prevTheme => prevTheme === "dark" ? "light" : "dark"),
  };
}
