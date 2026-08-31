import NgomaMark from "../components/NgomaMark.jsx";

const F = "'Instrument Sans','Inter',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
const S = "'Source Serif 4',Georgia,serif";

const sections = [
  {
    title: "Information We Collect",
    body: [
      "The public Ngoma Charts app does not require visitors to create an account and does not ask public users to submit personal information.",
      "When you use the public app, the service may process routine technical and analytics information such as IP address, device or browser details, language, timezone, access times, pages viewed, clicks, scroll depth, page speed, referral source, campaign tags, and error logs so the app can load, stay secure, and be improved.",
      "If you contact us by email, we receive the information you choose to send, including your email address and message.",
      "Administrative CMS areas are for approved Ngoma Charts team members only. If an approved team member signs in, we process login and session information needed to operate the CMS.",
    ],
  },
  {
    title: "How We Use Information",
    body: [
      "We use information to operate Ngoma Charts, load chart data, maintain security, troubleshoot issues, respond to messages, and improve the app experience.",
      "We do not sell personal information.",
    ],
  },
  {
    title: "Local Storage and Caching",
    body: [
      "The app may use local storage or IndexedDB on your device to remember preferences such as theme and to cache public chart data so pages load faster and can recover from temporary network issues.",
      "The public app may also store a random anonymous analytics ID in local storage. This helps count repeat visits without using advertising cookies or asking visitors to sign in.",
      "You can clear this data using your browser or device settings.",
    ],
  },
  {
    title: "Sharing",
    body: [
      "We may share limited information with service providers that help us host, secure, and operate the app and API.",
      "We may disclose information if required by law, regulation, court order, or to protect the rights, safety, and security of Ngoma Charts, our users, or the public.",
    ],
  },
  {
    title: "Children",
    body: [
      "Ngoma Charts is a music charts and analytics service intended for a general audience. We do not knowingly collect personal information from children.",
      "If you believe a child has provided personal information to us, contact us and we will review the request.",
    ],
  },
  {
    title: "Your Choices",
    body: [
      "You may contact us to request access, correction, or deletion of personal information you have provided to us, subject to applicable law and legitimate operational needs.",
    ],
  },
  {
    title: "Changes",
    body: [
      "We may update this Privacy Policy from time to time. The latest version will be posted on this page with an updated effective date.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main style={{minHeight:"100vh",background:"#F6F3EA",color:"#191B17",fontFamily:F,padding:"clamp(22px,5vw,58px)"}}>
      <div style={{maxWidth:"920px",margin:"0 auto"}}>
        <a href="/" style={{display:"inline-flex",alignItems:"center",gap:"10px",color:"#191B17",textDecoration:"none",fontWeight:900,letterSpacing:"0.08em",textTransform:"uppercase",fontSize:"12px"}}>
          <NgomaMark size={34} inkColor="#191B17" />
          Ngoma Charts
        </a>

        <section style={{padding:"clamp(34px,7vw,72px) 0 28px",borderBottom:"1px solid rgba(25,27,23,0.16)"}}>
          <p style={{margin:"0 0 12px",fontSize:"12px",fontWeight:900,letterSpacing:"0.12em",textTransform:"uppercase",color:"#7A6A2E"}}>Effective August 31, 2026</p>
          <h1 style={{fontFamily:S,fontSize:"clamp(42px,8vw,82px)",lineHeight:0.95,margin:"0 0 18px",letterSpacing:0}}>Privacy Policy</h1>
          <p style={{maxWidth:"720px",fontSize:"clamp(16px,2.2vw,20px)",lineHeight:1.65,margin:0,color:"#000000"}}>
            This Privacy Policy explains how Ngoma Media Ltd handles information for Ngoma Charts, including the website and Android app.
          </p>
        </section>

        <section style={{display:"grid",gap:"26px",padding:"34px 0 44px"}}>
          {sections.map((section) => (
            <article key={section.title} style={{display:"grid",gap:"10px"}}>
              <h2 style={{fontFamily:S,fontSize:"clamp(24px,4vw,34px)",lineHeight:1.1,margin:0,letterSpacing:0}}>{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} style={{fontSize:"15.5px",lineHeight:1.75,margin:0,color:"#000000"}}>{paragraph}</p>
              ))}
            </article>
          ))}
        </section>

        <section style={{borderTop:"1px solid rgba(25,27,23,0.16)",padding:"26px 0 0",display:"grid",gap:"8px"}}>
          <h2 style={{fontFamily:S,fontSize:"28px",lineHeight:1.1,margin:0,letterSpacing:0}}>Contact</h2>
          <p style={{fontSize:"15.5px",lineHeight:1.75,margin:0,color:"#000000"}}>
            For privacy questions, contact Ngoma Media Ltd at{" "}
            <a href="mailto:ngomacharts@gmail.com" style={{color:"#191B17",fontWeight:800}}>ngomacharts@gmail.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
