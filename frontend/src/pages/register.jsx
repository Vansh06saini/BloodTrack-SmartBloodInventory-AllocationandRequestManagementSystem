import RegisterForm from "../components/registerform";

function Register() {
    return (
        <main className="register-page">
            <section className="register-container">
                <div className="register-intro">
                    <div className="brand">
                        <h1>Smart Blood</h1>
                        <p>Inventory Management System</p>
                    </div>

                    <div className="intro-content">
                        <h2>Manage blood inventory with confidence.</h2>
                        <p>
                            A centralized system for hospitals and blood bank staff to
                            manage blood requests, inventory, allocations, alerts, and
                            demand forecasts.
                        </p>
                    </div>
                </div>

                <div className="register-panel">
                    <RegisterForm />
                </div>
            </section>
        </main>
    );
}

export default Register;