import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/auth/context";
import { APP_ROUTES } from "@/routes/common/routePaths";
import "./SignIn.css";

const schema = z.object({
  email: z.string().min(1, "Nama pengguna wajib diisi").email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

type FormValues = z.infer<typeof schema>;

/** Flask wordmark — `stroke` is themed per placement (dark on light, white on mobile). */
function FlaskMark({ stroke }: { stroke: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 2.5h6M10 2.5v6.2L5.4 17a3 3 0 0 0 2.6 4.5h8a3 3 0 0 0 2.6-4.5L14 8.7V2.5"
        stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M7.2 14.5c2 1 3.6-1 5.6 0s3.4-0.6 4-1"
        stroke={stroke} strokeWidth="1.7" strokeLinecap="round"
      />
    </svg>
  );
}

function SignIn() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPw, setShowPw] = useState(false);

  const {
    register, handleSubmit, setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await login(values.email, values.password);
      navigate(APP_ROUTES.DASHBOARD, { replace: true });
    } catch (err: any) {
      setError("root", { message: err?.message ?? "Login gagal. Silakan coba lagi." });
    }
  };

  const errorMessage =
    errors.root?.message ?? errors.email?.message ?? errors.password?.message ?? "";

  return (
    <div className="xemr-login">
      <div className="shell">

        {/* ============ LEFT: BRAND ============ */}
        <aside className="brand">
          <div className="wordmark">
            <div className="mark"><FlaskMark stroke="#06312E" /></div>
            <div>
              <span className="name">XEMR</span>
              <span className="sub">Electronic Medical Record</span>
            </div>
          </div>

          <div className="qc">
            <div className="qc-eyebrow">Kontrol mutu · langsung</div>
            <svg className="qc-chart" viewBox="0 0 460 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              {/* reference lines */}
              <line className="ref-line" x1="44" y1="20" x2="450" y2="20" />
              <line className="ref-line" x1="44" y1="58" x2="450" y2="58" />
              <line className="ref-line mean" x1="44" y1="110" x2="450" y2="110" />
              <line className="ref-line" x1="44" y1="162" x2="450" y2="162" />
              <line className="ref-line" x1="44" y1="200" x2="450" y2="200" />
              <text className="ref-label" x="0" y="23">+2SD</text>
              <text className="ref-label" x="2" y="61">+1SD</text>
              <text className="ref-label" x="2" y="113">MEAN</text>
              <text className="ref-label" x="4" y="165">−1SD</text>
              <text className="ref-label" x="2" y="203">−2SD</text>

              {/* data line */}
              <polyline className="data-line"
                points="60,118 96,92 132,128 168,84 204,114 240,70 276,132 312,98 348,46 384,122 420,108" />

              {/* data points */}
              <g className="pt" style={{ animationDelay: "0.6s" }}><circle cx="60" cy="118" r="4" /></g>
              <g className="pt" style={{ animationDelay: "0.85s" }}><circle cx="96" cy="92" r="4" /></g>
              <g className="pt" style={{ animationDelay: "1.1s" }}><circle cx="132" cy="128" r="4" /></g>
              <g className="pt" style={{ animationDelay: "1.35s" }}><circle cx="168" cy="84" r="4" /></g>
              <g className="pt" style={{ animationDelay: "1.6s" }}><circle cx="204" cy="114" r="4" /></g>
              <g className="pt" style={{ animationDelay: "1.85s" }}><circle cx="240" cy="70" r="4" /></g>
              <g className="pt" style={{ animationDelay: "2.1s" }}><circle cx="276" cy="132" r="4" /></g>
              <g className="pt" style={{ animationDelay: "2.35s" }}><circle cx="312" cy="98" r="4" /></g>
              <g className="pt flag" style={{ animationDelay: "2.6s" }}><circle cx="348" cy="46" r="5" /></g>
              <g className="pt" style={{ animationDelay: "2.85s" }}><circle cx="384" cy="122" r="4" /></g>
              <g className="pt" style={{ animationDelay: "3.1s" }}><circle cx="420" cy="108" r="4" /></g>
            </svg>
            <div className="qc-caption">Aturan Westgard · 1 titik <b>menyimpang &gt; 2SD</b> · ditandai</div>
          </div>

          <div>
            <div className="tagline">
              <h1>Presisi yang bisa dipertanggungjawabkan.</h1>
              <p>Satu pintu masuk untuk seluruh alur laboratorium — dari sampling, validasi hasil, hingga penerbitan sertifikat.</p>
            </div>
          </div>

          <div className="status">
            <span><span className="dot" /> Sistem aktif</span>
            <span>v2.4.1</span>
            <span>BLKD Sulawesi Utara</span>
          </div>
        </aside>

        {/* ============ RIGHT: FORM ============ */}
        <main className="panel">
          <div className="form-wrap">

            <div className="mobile-brand">
              <div className="mark"><FlaskMark stroke="#fff" /></div>
              <div>
                <div className="name">XEMR</div>
                <div className="sub">Sistem Laboratorium</div>
              </div>
            </div>

            <div className="eyebrow">Akses Petugas</div>
            <h2>Masuk ke akun</h2>
            <p className="lede">Gunakan kredensial yang diberikan administrator laboratorium.</p>

            <div className={`err${errorMessage ? " show" : ""}`} role="alert">
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 8v5M12 16.5v.5M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span>{errorMessage}</span>
            </div>

            <form autoComplete="off" noValidate onSubmit={handleSubmit(onSubmit)}>
              <div className="field">
                <label htmlFor="user">Email</label>
                <div className="input-box">
                  <input
                    type="email" id="user" placeholder="mis. analis@lab.go.id"
                    autoComplete="username" {...register("email")}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="pw">Kata sandi</label>
                <div className="input-box has-icon">
                  <input
                    type={showPw ? "text" : "password"} id="pw" placeholder="••••••••"
                    autoComplete="current-password" {...register("password")}
                  />
                  <button
                    type="button" className="toggle-pw" onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  >
                    {showPw ? (
                      <svg viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4 4M9.4 5.2A9.6 9.6 0 0 1 12 5c6.4 0 10 7 10 7a16 16 0 0 1-3.3 4M6.2 6.2A16 16 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 2.6-.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.7" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="row">
                <label className="check">
                  <input type="checkbox" />
                  <span className="box"><svg viewBox="0 0 24 24" fill="none"><path d="m4 12 5 5 11-11" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                  <span>Ingat saya</span>
                </label>
                <a href="#" className="link">Lupa kata sandi?</a>
              </div>

              <button type="submit" className={`btn${isSubmitting ? " loading" : ""}`} disabled={isSubmitting}>
                <span className="label">Masuk</span>
                <svg className="arr" viewBox="0 0 24 24" fill="none"><path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="spinner" />
              </button>
            </form>

            <p className="foot">Butuh akun? Hubungi <a href="#">administrator laboratorium</a><br />© {new Date().getFullYear()} PT Kristalab Surya Medika</p>
          </div>
        </main>

      </div>
    </div>
  );
}

export default SignIn;
