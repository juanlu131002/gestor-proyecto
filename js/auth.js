// ============================================================
// LOGIN
// ============================================================

const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', async (event) => {

  event.preventDefault();

  const email =
    document.getElementById('loginEmail').value;

  const password =
    document.getElementById('loginPassword').value;

  const message =
    document.getElementById('loginMessage');


  message.textContent = 'Iniciando sesión...';
  message.classList.remove('error', 'success');


  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });


  if (error) {

    console.error(error);

    message.textContent =
      'Error: ' + error.message;

    message.classList.add('error');

    return;
  }


  console.log('Usuario:', data.user);

  message.textContent =
    'Sesión iniciada correctamente';

  message.classList.add('success');


  window.location.href =
    'dashboard.html';

});



// ============================================================
// REGISTRO
// ============================================================

const registerForm =
  document.getElementById('registerForm');


registerForm.addEventListener('submit', async (event) => {

  event.preventDefault();


  const fullName =
    document.getElementById('registerName').value;

  const email =
    document.getElementById('registerEmail').value;

  const password =
    document.getElementById('registerPassword').value;

  const message =
    document.getElementById('registerMessage');


  message.textContent =
    'Creando cuenta...';

  message.classList.remove('error', 'success');


  const { data, error } =
    await supabaseClient.auth.signUp({

      email,

      password,

      options: {

        data: {
          full_name: fullName,
          app: 'gestor_proyecto'
        }

      }

    });


  if (error) {

    console.error(error);

    message.textContent =
      'Error: ' + error.message;

    message.classList.add('error');

    return;
  }


  console.log(
    'Usuario creado:',
    data.user
  );


  message.textContent =
    'Cuenta creada correctamente.';

  message.classList.add('success');

});

// ============================================================
// CAMBIAR ENTRE LOGIN Y REGISTRO
// ============================================================

const showRegisterButton =
  document.getElementById('showRegisterButton');

const showLoginButton =
  document.getElementById('showLoginButton');

const registerPanel =
  document.getElementById('registerPanel');

const loginCard =
  document.querySelector('.auth-card:not(.register-card)');


showRegisterButton.addEventListener('click', () => {

  loginCard.classList.add('hidden');

  registerPanel.classList.remove('hidden');

});


showLoginButton.addEventListener('click', () => {

  registerPanel.classList.add('hidden');

  loginCard.classList.remove('hidden');

});



// ============================================================
// MOSTRAR / OCULTAR CONTRASEÑA
// ============================================================

const toggleLoginPassword =
  document.getElementById('toggleLoginPassword');

const loginPassword =
  document.getElementById('loginPassword');


toggleLoginPassword.addEventListener('click', () => {

  const isPassword =
    loginPassword.type === 'password';

  loginPassword.type =
    isPassword
      ? 'text'
      : 'password';


  /*
     Alternamos qué icono se ve mediante una clase
     de estado en el botón (en vez de sustituir el
     icono por texto, que lo perdía para siempre).
  */

  toggleLoginPassword.classList.toggle(
    'is-visible',
    isPassword
  );


  toggleLoginPassword.setAttribute(
    'aria-label',
    isPassword
      ? 'Ocultar contraseña'
      : 'Mostrar contraseña'
  );

});