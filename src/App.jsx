import { useState } from 'react';
import api from './api/client';
import './App.css';
import LoginSelector from './components/LoginSelector';
import NavTabs from './components/NavTabs';
import UsersView from './views/UsersView';
import TransactionsView from './views/TransactionsView';
import BudgetsView from './views/BudgetsView';
import AlertsView from './views/AlertsView';
import DashboardView from './views/DashboardView';
import SystemStatusView from './views/SystemStatusView';
import AnalysisView from './views/AnalysisView';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
    api.setToken(null);
  };

  // Show login screen if no user is selected
  if (!currentUser) {
    return <LoginSelector onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Finanzas Personales</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="user-badge">
              <div className="avatar">
                {currentUser.nombre.charAt(0).toUpperCase()}
              </div>
              <span>{currentUser.nombre}</span>
            </div>
            <button className="btn-logout" onClick={handleLogout}>
              Cerrar Sesión
            </button>
          </div>
        </div>
        <NavTabs active={activeTab} onChange={setActiveTab} />
      </header>

      <main className="app-main">
        <section style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }} aria-hidden={activeTab !== 'dashboard'}>
          <DashboardView userId={currentUser.id} userName={currentUser.nombre} />
        </section>
        <section style={{ display: activeTab === 'transacciones' ? 'block' : 'none' }} aria-hidden={activeTab !== 'transacciones'}>
          <TransactionsView userId={currentUser.id} />
        </section>
        <section style={{ display: activeTab === 'presupuestos' ? 'block' : 'none' }} aria-hidden={activeTab !== 'presupuestos'}>
          <BudgetsView userId={currentUser.id} />
        </section>
        <section style={{ display: activeTab === 'alertas' ? 'block' : 'none' }} aria-hidden={activeTab !== 'alertas'}>
          <AlertsView userId={currentUser.id} />
        </section>
        <section style={{ display: activeTab === 'analisis' ? 'block' : 'none' }} aria-hidden={activeTab !== 'analisis'}>
          <AnalysisView userId={currentUser.id} />
        </section>
        <section style={{ display: activeTab === 'sistema' ? 'block' : 'none' }} aria-hidden={activeTab !== 'sistema'}>
          <SystemStatusView />
        </section>
      </main>

      <footer className="app-footer">
        <p>Sistema Multiagente de Finanzas Personales • Usuario activo: {currentUser.nombre}</p>
      </footer>
    </div>
  );
}

export default App;
