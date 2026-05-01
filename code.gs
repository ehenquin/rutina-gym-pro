const SHEET_ID = "18D9XDP0VajsQac5RMdhKnm8qh5HEH72_v6GoY8UOutg";

function doGet(e){
  return ContentService
    .createTextOutput("API running")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e){

  try{

    if(!e.postData){
      return json({status:"no_data"});
    }

    const data = JSON.parse(e.postData.contents || "{}");
    const action = data.action;

    if(action === "login") return login(data);
    if(action === "register") return register(data);
    if(action === "saveRoutine") return saveRoutine(data);
    if(action === "loadRoutine") return loadRoutine(data);

    return json({status:"unknown_action"});

  }catch(err){

    return json({
      status:"error",
      message: err.toString()
    });

  }

}

function login(data){

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("usuarios");
  const rows = sheet.getDataRange().getValues();

  for(let i=1;i<rows.length;i++){

    if(rows[i][0] == data.telefono && rows[i][1] == data.password){

      if(rows[i][2] !== true){
        return json({status:"blocked"});
      }

      return json({status:"ok"});
    }

  }

  return json({status:"error"});

}

function register(data){

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("usuarios");
  const rows = sheet.getDataRange().getValues();

  for(let i=1;i<rows.length;i++){
    if(rows[i][0] == data.telefono){
      return json({status:"exists"});
    }
  }

  sheet.appendRow([
    data.telefono,
    data.password,
    true,
    new Date(),
    new Date()
  ]);

  return json({status:"ok"});

}

function saveRoutine(data){

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("rutinas");
  const rows = sheet.getDataRange().getValues();

  for(let i=1;i<rows.length;i++){

    if(rows[i][0] == data.telefono){

      sheet.getRange(i+1,2).setValue(data.rutina);
      sheet.getRange(i+1,3).setValue(new Date());

      return json({status:"updated"});
    }

  }

  sheet.appendRow([
    data.telefono,
    data.rutina,
    new Date()
  ]);

  return json({status:"created"});

}

function loadRoutine(data){

  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName("rutinas");
  const rows = sheet.getDataRange().getValues();

  for(let i=1;i<rows.length;i++){

    if(rows[i][0] == data.telefono){

      return json({
        status:"ok",
        rutina: rows[i][1]
      });

    }

  }

  return json({status:"empty"});

}

function json(obj){
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}