import { BrowserRouter } from "react-router-dom";
import AppRoutes from "@/routes";
import { ThemeProvider } from "./contexts/theme/Provider";
import { LocaleProvider } from "./contexts/locale/Provider";
import { AuthProvider } from "./contexts/auth/Provider";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LocaleProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </LocaleProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
