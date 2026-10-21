import { test, expect } from '@playwright/test';

test('CP01 - Sin indicar cantidad', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '22 de octubre de 2026,' }).click();

  // Se quita la cantidad de entradas y se deja en blanco para que aparezca el mensaje de error
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('');

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  // Mensaje de error que aparece cuando la cantidad no esta seleccionado
  await expect(page.getByText('La cantidad de entradas es obligatoria')).toBeVisible();

});

test('CP02 - Con cantidad cero', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '22 de octubre de 2026,' }).click();

  // Se introduce una cantidad de cero para que aparezca el mensaje de error
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('0');

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  // Mensaje de error que aparece cuando la cantidad es cero
  await expect(page.getByText('La cantidad de entradas debe ser mayor a cero')).toBeVisible();

});

test('CP03 - Con cantidad negativa', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '22 de octubre de 2026,' }).click();

  // Se introduce una cantidad negativa para que aparezca el mensaje de error
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('-1');

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  // Mensaje de error que aparece cuando la cantidad no esta seleccionado
  await expect(page.getByText('La cantidad de entradas debe ser mayor a cero')).toBeVisible();

});

test('CP04 - Con cantidad decimal', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '22 de octubre de 2026,' }).click();

  // Se introduce una cantidad decimal para que aparezca el mensaje de error
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('1.5');  

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  // Mensaje de error que aparece cuando la cantidad es un decimal
  await expect(page.getByText('La cantidad de entradas debe ser un número entero')).toBeVisible();

});

test('CP05/26 - Con cantidad uno y regular', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '22 de octubre de 2026,' }).click();

  // Se introduce una cantidad decimal para que aparezca el mensaje de error
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('1');  

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await page.getByRole('spinbutton', { name: 'Edad del visitante' }).fill('20');

  await page.locator('.pase__opcion').filter({ has: page.locator('input[value="REGULAR"]') }).click();

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByText('¡Entradas registradas!')).toBeVisible();

  await expect(page.getByText('Registraste 1 entrada para el 22/10/2026. El pago se encuentra pendiente en boletería')).toBeVisible();

  await expect(page.getByText('Regular · 20 años · $10.000')).toBeVisible();

});

test('CP06 - Con cantidad diez', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '31 de octubre de 2026,' }).click();

  // Se introduce una cantidad decimal para que aparezca el mensaje de error
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('10');  

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  const edades = await page.getByRole('spinbutton', { name: 'Edad del visitante' }).all();

  for (const edad of edades) {
    await edad.fill('20');
  }

  const regulares = await page.locator('.pase__opcion').filter({ has: page.locator('input[value="REGULAR"]') }).all();

  for (const regular of regulares) {
    await regular.click();
  }

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByText('¡Entradas registradas!')).toBeVisible();

  await expect(page.getByText('El pago se encuentra pendiente en boletería')).toBeVisible();

});

test('CP07 - Con cantidad once', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
    await page.getByRole('button', { name: '23 de octubre de 2026,' }).click();

  // Se introduce una cantidad negativa para que aparezca el mensaje de error
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('11');

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  // Mensaje de error cuando se quiere comprar más de 10 entradas para una misma fecha
  await expect(page.getByText('No se pueden comprar más de 10 entradas para una misma fecha')).toBeVisible();

  await expect(page.getByText('Máximo 10 entradas por fecha, sumando todas tus compras')).toBeVisible();

});

test('CP08/22 - Primero 7 y luego 3', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '28 de octubre de 2026,' }).click();

  // Se compran las primeras 7
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('7');

  const edades = await page.getByRole('spinbutton', { name: 'Edad del visitante' }).all();

  for (const edad of edades) {
    await edad.fill('20');
  }

  const regulares = await page.locator('.pase__opcion').filter({ has: page.locator('input[value="REGULAR"]') }).all();

  for (const regular of regulares) {
    await regular.click();
  }

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByText('¡Entradas registradas!')).toBeVisible();

  await expect(page.getByText('El pago se encuentra pendiente en boletería')).toBeVisible();

  await page.getByRole('button', { name: 'Comprar más entradas' }).click();

  // Se compran 3 más
  await page.getByRole('button', { name: '28 de octubre de 2026,' }).click();

  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('3');

  const edades2 = await page.getByRole('spinbutton', { name: 'Edad del visitante' }).all();

  for (const edad2 of edades2) {
    await edad2.fill('20');
  }

  const regulares2 = await page.locator('.pase__opcion').filter({ has: page.locator('input[value="REGULAR"]') }).all();

  for (const regular2 of regulares2) {
    await regular2.click();
  }

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByText('¡Entradas registradas!')).toBeVisible();

  await expect(page.getByText('El pago se encuentra pendiente en boletería')).toBeVisible();
});

test('CP09 - Primero 7 y luego 4', async ({ page }) => {
    await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '29 de octubre de 2026,' }).click();

  // Se compran las primeras 7
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('7');

  const edades = await page.getByRole('spinbutton', { name: 'Edad del visitante' }).all();

  for (const edad of edades) {
    await edad.fill('20');
  }

  const regulares = await page.locator('.pase__opcion').filter({ has: page.locator('input[value="REGULAR"]') }).all();

  for (const regular of regulares) {
    await regular.click();
  }

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByText('¡Entradas registradas!')).toBeVisible();

  await expect(page.getByText('El pago se encuentra pendiente en boletería')).toBeVisible();

  await page.getByRole('button', { name: 'Comprar más entradas' }).click();

  // Se compran 3 más
  await page.getByRole('button', { name: '29 de octubre de 2026,' }).click();

  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('4');

  const edades2 = await page.getByRole('spinbutton', { name: 'Edad del visitante' }).all();

  for (const edad2 of edades2) {
    await edad2.fill('20');
  }

  const regulares2 = await page.locator('.pase__opcion').filter({ has: page.locator('input[value="REGULAR"]') }).all();

  for (const regular2 of regulares2) {
    await regular2.click();
  }

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  // Mensaje de error cuando se quiere comprar más de 10 entradas para una misma fecha
  await expect(page.getByText('No podés superar las 10 entradas para la misma fecha.')).toBeVisible();

});

test('CP10/16 - Primero 10 de un día y luego 10 de otro día', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: 'Mes siguiente' }).click();

  await page.getByRole('button', { name: '3 de noviembre de 2026,' }).first().click();

  // Se compran las primeras 10
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('10');

  const edades = await page.getByRole('spinbutton', { name: 'Edad del visitante' }).all();

  for (const edad of edades) {
    await edad.fill('20');
  }

  const regulares = await page.locator('.pase__opcion').filter({ has: page.locator('input[value="REGULAR"]') }).all();

  for (const regular of regulares) {
    await regular.click();
  }

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByText('¡Entradas registradas!')).toBeVisible();

  await expect(page.getByText('El pago se encuentra pendiente en boletería')).toBeVisible();

  await page.getByRole('button', { name: 'Comprar más entradas' }).click();

  // Se compran 10 otro día más
  await page.getByRole('button', { name: 'Mes siguiente' }).click();

  await page.getByRole('button', { name: '4 de noviembre de 2026,' }).first().click();

  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('10');

  const edades2 = await page.getByRole('spinbutton', { name: 'Edad del visitante' }).all();

  for (const edad2 of edades2) {
    await edad2.fill('20');
  }

  const regulares2 = await page.locator('.pase__opcion').filter({ has: page.locator('input[value="REGULAR"]') }).all();

  for (const regular2 of regulares2) {
    await regular2.click();
  }

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByText('¡Entradas registradas!')).toBeVisible();

  await expect(page.getByText('El pago se encuentra pendiente en boletería')).toBeVisible();
});

test('CP11 - Sin ingresar fecha', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  // Se quita la cantidad de entradas y se deja en blanco para que aparezca el mensaje de error
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('1');

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await page.getByRole('spinbutton', { name: 'Edad del visitante' }).fill('20');

  await page.locator('.pase__opcion').filter({ has: page.locator('input[value="REGULAR"]') }).click();

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  // Mensaje de error que aparece cuando la fecha no esta seleccionada
  await expect(page.getByText('La fecha de visita es obligatoria')).toBeVisible();

});

// CP12-14 - No automatizables, ya que dependen del horario

test('CP15 - Con fecha anterior', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await expect(page.getByRole('button', { name: '10 de octubre de 2026,' })).toBeDisabled();

});

test('CP17 - Un mes siguiente', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: 'Mes siguiente' }).click();

  await page.getByRole('button', { name: `${new Date().toLocaleDateString('es-ES', { day: '2-digit' })} de noviembre de 2026,` }).first().click();

  // Se compran las primeras 10
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('5');

  const edades = await page.getByRole('spinbutton', { name: 'Edad del visitante' }).all();

  for (const edad of edades) {
    await edad.fill('20');
  }

  const regulares = await page.locator('.pase__opcion').filter({ has: page.locator('input[value="REGULAR"]') }).all();

  for (const regular of regulares) {
    await regular.click();
  }

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByText('¡Entradas registradas!')).toBeVisible();

  await expect(page.getByText('El pago se encuentra pendiente en boletería')).toBeVisible();

});

test('CP18 - Mas de un mes siguiente', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: 'Mes siguiente' }).click();

  const dia = new Date().getDate() + 1;

  await expect(page.getByRole('button', { name: `${dia} de noviembre de 2026,` })).toBeDisabled();

});

test('CP19 - Un día Lunes', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await expect(page.getByRole('button', { name: '26 de octubre de 2026,' })).toBeDisabled();

});

// CP20/21 - No automatizables, se pasan de la programación de un mes

test('CP23 - Uno sin edad', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '23 de octubre de 2026,' }).click();

  // Se compran las primeras 7
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('7');

  const edades = await page.getByRole('spinbutton', { name: 'Edad del visitante' }).all();

  for (let i = 0; i < edades.length; i++) {
    if (i === 0) continue; // Saltea el segundo visitante
    await edades[i].fill('20');
  }

  const regulares = await page.locator('.pase__opcion').filter({ has: page.locator('input[value="REGULAR"]') }).all();

  for (const regular of regulares) {
    await regular.click();
  }

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByText('Se debe informar la edad de cada visitante')).toBeVisible();

});

test('CP24 - Con edad negativa', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '28 de octubre de 2026,' }).click();

  // Se introduce una cantidad decimal para que aparezca el mensaje de error
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('1');  

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await page.getByRole('spinbutton', { name: 'Edad del visitante' }).fill('-20');

  await page.locator('.pase__opcion').filter({ has: page.locator('input[value="REGULAR"]') }).click();

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByRole('alert').getByText('La edad de los visitantes no puede ser negativa')).toBeVisible();

});

test('CP25 - Sin seleccionar pase', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '28 de octubre de 2026,' }).click();

  // Se introduce una cantidad decimal para que aparezca el mensaje de error
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('1');  

  await page.getByRole('spinbutton', { name: 'Edad del visitante' }).fill('20');

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByRole('alert').getByText('Se debe seleccionar el tipo de pase (Regular o VIP) de cada visitante')).toBeVisible();

});

test('CP27 - Uno pase vip sin descuento', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '22 de octubre de 2026,' }).click();

  // Se introduce una cantidad decimal para que aparezca el mensaje de error
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('1');  

  await page.getByRole('spinbutton', { name: 'Edad del visitante' }).fill('20');

  await page.locator('.pase__opcion').filter({ has: page.locator('input[value="VIP"]') }).click();

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByText('¡Entradas registradas!')).toBeVisible();

  await expect(page.getByText('Registraste 1 entrada para el 22/10/2026. El pago se encuentra pendiente en boletería')).toBeVisible();

  await expect(page.getByText('VIP · 20 años · $20.000')).toBeVisible();

});

test('CP28 - Regular con edad tres', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '22 de octubre de 2026,' }).click();

  // Se introduce una cantidad decimal para que aparezca el mensaje de error
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('1');  

  await page.getByRole('spinbutton', { name: 'Edad del visitante' }).fill('3');

  await page.locator('.pase__opcion').filter({ has: page.locator('input[value="REGULAR"]') }).click();

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByText('¡Entradas registradas!')).toBeVisible();

  await expect(page.getByText('Registraste 1 entrada para el 22/10/2026. El pago se encuentra pendiente en boletería')).toBeVisible();

  await expect(page.getByText('REGULAR · 3 años · $0')).toBeVisible();

});

test('CP29 - Regular con edad cuatro', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '22 de octubre de 2026,' }).click();

  // Se introduce una cantidad decimal para que aparezca el mensaje de error
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('1');  

  await page.getByRole('spinbutton', { name: 'Edad del visitante' }).fill('4');

  await page.locator('.pase__opcion').filter({ has: page.locator('input[value="REGULAR"]') }).click();

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByText('¡Entradas registradas!')).toBeVisible();

  await expect(page.getByText('Registraste 1 entrada para el 22/10/2026. El pago se encuentra pendiente en boletería')).toBeVisible();

  await expect(page.getByText('REGULAR · 4 años · $5.000')).toBeVisible();

});

test('CP30 - Regular con edad quince', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '22 de octubre de 2026,' }).click();

  // Se introduce una cantidad decimal para que aparezca el mensaje de error
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('1');  

  await page.getByRole('spinbutton', { name: 'Edad del visitante' }).fill('15');

  await page.locator('.pase__opcion').filter({ has: page.locator('input[value="REGULAR"]') }).click();

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByText('¡Entradas registradas!')).toBeVisible();

  await expect(page.getByText('Registraste 1 entrada para el 22/10/2026. El pago se encuentra pendiente en boletería')).toBeVisible();

  await expect(page.getByText('REGULAR · 15 años · $5.000')).toBeVisible();

});

test('CP31 - Regular con edad dieciseis', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '22 de octubre de 2026,' }).click();

  // Se introduce una cantidad decimal para que aparezca el mensaje de error
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('1');  

  await page.getByRole('spinbutton', { name: 'Edad del visitante' }).fill('16');

  await page.locator('.pase__opcion').filter({ has: page.locator('input[value="REGULAR"]') }).click();

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByText('¡Entradas registradas!')).toBeVisible();

  await expect(page.getByText('Registraste 1 entrada para el 22/10/2026. El pago se encuentra pendiente en boletería')).toBeVisible();

  await expect(page.getByText('REGULAR · 16 años · $10.000')).toBeVisible();

});

test('CP32 - Regular con edad cincuenta y nueve', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '22 de octubre de 2026,' }).click();

  // Se introduce una cantidad decimal para que aparezca el mensaje de error
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('1');  

  await page.getByRole('spinbutton', { name: 'Edad del visitante' }).fill('59');

  await page.locator('.pase__opcion').filter({ has: page.locator('input[value="REGULAR"]') }).click();

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByText('¡Entradas registradas!')).toBeVisible();

  await expect(page.getByText('Registraste 1 entrada para el 22/10/2026. El pago se encuentra pendiente en boletería')).toBeVisible();

  await expect(page.getByText('REGULAR · 59 años · $10.000')).toBeVisible();

});

test('CP33 - Regular con edad sesenta', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '22 de octubre de 2026,' }).click();

  // Se introduce una cantidad decimal para que aparezca el mensaje de error
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('1');  

  await page.getByRole('spinbutton', { name: 'Edad del visitante' }).fill('60');

  await page.locator('.pase__opcion').filter({ has: page.locator('input[value="REGULAR"]') }).click();

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByText('¡Entradas registradas!')).toBeVisible();

  await expect(page.getByText('Registraste 1 entrada para el 22/10/2026. El pago se encuentra pendiente en boletería')).toBeVisible();

  await expect(page.getByText('REGULAR · 60 años · $5.000')).toBeVisible();

});

test('CP34 - VIP con descuentos', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '24 de octubre de 2026,' }).click();

  // Se introduce una cantidad decimal para que aparezca el mensaje de error
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('1');  

  await page.getByRole('spinbutton', { name: 'Edad del visitante' }).fill('3');

  await page.locator('.pase__opcion').filter({ has: page.locator('input[value="VIP"]') }).click();

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByText('¡Entradas registradas!')).toBeVisible();

  await expect(page.getByText('Registraste 1 entrada para el 24/10/2026. El pago se encuentra pendiente en boletería')).toBeVisible();

  await expect(page.getByText('VIP · 3 años · $0')).toBeVisible();

  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '24 de octubre de 2026,' }).click();

  // Se introduce una cantidad decimal para que aparezca el mensaje de error
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('1');  

  await page.getByRole('spinbutton', { name: 'Edad del visitante' }).fill('4');

  await page.locator('.pase__opcion').filter({ has: page.locator('input[value="VIP"]') }).click();

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByText('¡Entradas registradas!')).toBeVisible();

  await expect(page.getByText('Registraste 1 entrada para el 24/10/2026. El pago se encuentra pendiente en boletería')).toBeVisible();

  await expect(page.getByText('VIP · 4 años · $10.000')).toBeVisible();

  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '24 de octubre de 2026,' }).click();

  // Se introduce una cantidad decimal para que aparezca el mensaje de error
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('1');  

  await page.getByRole('spinbutton', { name: 'Edad del visitante' }).fill('15');

  await page.locator('.pase__opcion').filter({ has: page.locator('input[value="VIP"]') }).click();

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByText('¡Entradas registradas!')).toBeVisible();

  await expect(page.getByText('Registraste 1 entrada para el 24/10/2026. El pago se encuentra pendiente en boletería')).toBeVisible();

  await expect(page.getByText('VIP · 15 años · $10.000')).toBeVisible();

  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '24 de octubre de 2026,' }).click();

  // Se introduce una cantidad decimal para que aparezca el mensaje de error
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('1');  

  await page.getByRole('spinbutton', { name: 'Edad del visitante' }).fill('16');

  await page.locator('.pase__opcion').filter({ has: page.locator('input[value="VIP"]') }).click();

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByText('¡Entradas registradas!')).toBeVisible();

  await expect(page.getByText('Registraste 1 entrada para el 24/10/2026. El pago se encuentra pendiente en boletería')).toBeVisible();

  await expect(page.getByText('VIP · 16 años · $20.000')).toBeVisible();

  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '24 de octubre de 2026,' }).click();

  // Se introduce una cantidad decimal para que aparezca el mensaje de error
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('1');  

  await page.getByRole('spinbutton', { name: 'Edad del visitante' }).fill('59');

  await page.locator('.pase__opcion').filter({ has: page.locator('input[value="VIP"]') }).click();

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByText('¡Entradas registradas!')).toBeVisible();

  await expect(page.getByText('Registraste 1 entrada para el 24/10/2026. El pago se encuentra pendiente en boletería')).toBeVisible();

  await expect(page.getByText('VIP · 59 años · $20.000')).toBeVisible();

  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '24 de octubre de 2026,' }).click();

  // Se introduce una cantidad decimal para que aparezca el mensaje de error
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('1');  

  await page.getByRole('spinbutton', { name: 'Edad del visitante' }).fill('60');

  await page.locator('.pase__opcion').filter({ has: page.locator('input[value="VIP"]') }).click();

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByText('¡Entradas registradas!')).toBeVisible();

  await expect(page.getByText('Registraste 1 entrada para el 24/10/2026. El pago se encuentra pendiente en boletería')).toBeVisible();

  await expect(page.getByText('VIP · 60 años · $10.000')).toBeVisible();

});

test('CP35 - Con distintas edades y pases', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  
  await page.getByRole('button', { name: '23 de octubre de 2026,' }).click();

  // Se compran las primeras 7
  await page.getByRole('spinbutton', { name: 'Cantidad de entradas' }).fill('6');

  const edades = await page.getByRole('spinbutton', { name: 'Edad del visitante' }).all();

  for (let i = 0; i < edades.length; i++) {
    if (i === 0) await edades[i].fill('0');
    if (i === 1) await edades[i].fill('3');
    if (i === 2) await edades[i].fill('4');
    if (i === 3) await edades[i].fill('59');
    if (i === 4) await edades[i].fill('60');
    if (i === 5) await edades[i].fill('99');
  }

  const regulares = await page.locator('.pase__opcion').filter({ has: page.locator('input[value="REGULAR"]') }).all();
  const vips = await page.locator('.pase__opcion').filter({ has: page.locator('input[value="VIP"]') }).all();

  for (let i = 0; i < regulares.length; i++) {
    if (i%2 === 0) {
      await regulares[i].click();
    } else {
      await vips[i].click();
    }
  }

  await page.locator('.forma-pago').filter({ has: page.locator('input[value="EFECTIVO"]') }).click();

  await page.getByRole('button', { name: 'Confirmar compra' }).click();

  await expect(page.getByText('$40.000')).toBeVisible();

  await expect(page.getByText('Regular · 0 años · $0')).toBeVisible();
  await expect(page.getByText('VIP · 3 años · $0')).toBeVisible();
  await expect(page.getByText('Regular · 4 años · $5.000')).toBeVisible();
  await expect(page.getByText('VIP · 59 años · $20.000')).toBeVisible();
  await expect(page.getByText('Regular · 60 años · $5.000')).toBeVisible();
  await expect(page.getByText('VIP · 99 años · $10.000')).toBeVisible();

});

// CP36-38 - No automatizable, ya que es control de sesiones y correo

