DO $$
BEGIN
  IF to_regclass('public."Administrador"') IS NOT NULL
     AND to_regclass('public."Owner"') IS NULL THEN
    ALTER TABLE public."Administrador" RENAME TO "Owner";
  END IF;

  IF to_regclass('public."Registro de Sellos"') IS NOT NULL
     AND to_regclass('public."Stamp"') IS NULL THEN
    ALTER TABLE public."Registro de Sellos" RENAME TO "Stamp";
  END IF;

  IF to_regclass('public."Token QR"') IS NOT NULL
     AND to_regclass('public."ScanToken"') IS NULL THEN
    ALTER TABLE public."Token QR" RENAME TO "ScanToken";
  END IF;

  IF to_regclass('public."Servicio"') IS NOT NULL
     AND to_regclass('public."Haircut"') IS NULL THEN
    ALTER TABLE public."Servicio" RENAME TO "Haircut";
  END IF;
END $$;
