import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import fullLogo from '../assets/logos/full.png';

const Login = ({ onLogin }) => {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(to right, #4F46E5, #06B6D4)'
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        width: '90%',  // Takes up 90% of screen width on mobile
        maxWidth: '400px',  // But never gets wider than 400px on desktop
        margin: '0 auto'
      }}>
       <img 
          src={fullLogo} 
          alt="Company Logo" 
          style={{
            maxWidth: '250px',
            height: 'auto',
            marginBottom: '20px'
          }}
        />
        <h1 style={{ 
          marginBottom: '2rem', 
          color: '#1F2937',
          fontSize: '1.5rem'  // Reduced from default h1 size
        }}>Spray Division Inventory Tracker</h1>
        <div style={{ 
          display: 'flex',
          justifyContent: 'center',
          width: '100%'
        }}>
          <GoogleLogin
            onSuccess={credentialResponse => {
              const decoded = jwtDecode(credentialResponse.credential);
              if (decoded.email.endsWith('@encorelm.com')) {
                onLogin(decoded);
              } else {
                alert('Please use your encorelm.com email to login');
              }
            }}
            onError={() => {
              console.log('Login Failed');
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Login;