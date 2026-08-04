/**
 * ==================================================================
 * SNIPPET DE MIGRATION - a coller dans Code.gs (ne fait rien tant
 * qu'il n'est pas appele par action=adminExportAllData)
 * ==================================================================
 */

// 1) Ajoute ce case dans le SWITCH INTERNE de doPost (celui qui gere les
//    actions authentifiees, juste apres "case 'adminBroadcastMessage':"
//    par exemple) :
//
//   case 'adminExportAllData':
//     result = adminExportAllData(user);
//     break;

// 2) Ajoute cette fonction (en dehors de doPost) :
function adminExportAllData(user) {
  const authorizedEmails = ['abmcompanysn@gmail.com'];
  if (!authorizedEmails.includes(user.Email) && user.Role !== 'SADMIN' && user.Role !== 'Admin') {
    throw new Error("Acces refuse. Export reserve aux administrateurs.");
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = [
    'Utilisateurs', 'Profils', 'Prospects', 'Documents', 'Support',
    'PhysicalCards', 'Resellers', 'Commandes', 'Commandes_Custom', 'Statistiques'
  ];

  const data = {};
  sheetNames.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (!sheet || sheet.getLastRow() < 2) {
      data[name] = [];
      return;
    }
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    data[name] = values.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        let v = row[i];
        if (v instanceof Date) v = v.toISOString();
        obj[h] = v;
      });
      return obj;
    });
  });

  return data;
}
