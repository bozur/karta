<%@LANGUAGE="VBSCRIPT" CODEPAGE="65001"%>

<!--#include file="../conn/conn.asp" -->
<%
Response.LCID = 2074
Dim upit
upit="1=1"


	vrsta=left(formatSQLInput(Request.Form("vrsta")),50)
	podvrsta=left(formatSQLInput(Request.Form("podvrsta")),50)
	razred=left(formatSQLInput(Request.Form("razred")),50)
	vrijeme0=Request.Form("vrijeme0")
	vrijeme1=Request.Form("vrijeme1")
	opis=left(formatSQLInput(Request.Form("opis")),255)
	
	If vrsta<>"" then upit=upit&" AND vrsta = '"+vrsta+"'" end if
	If podvrsta<>"" then upit=upit&" AND podvrsta like '"+podvrsta+"'" end if
	If razred<>"" then upit=upit&" AND razred like '"+razred+"'" end if
	If vrijeme0<>"" then 
		vrijeme0=datepart("m",vrijeme0)&"."&datepart("d",vrijeme0)&"."&datepart("yyyy",vrijeme0)
		upit=upit&" AND vrijeme0 >= '"+vrijeme0+"'" 
	end if
	If vrijeme1<>"" then 
		vrijeme1=datepart("m",vrijeme1)&"."&datepart("d",vrijeme1)&"."&datepart("yyyy",vrijeme1)
		upit=upit&" AND vrijeme1 < '"+vrijeme1+"'" 
	end if
	If opis<>"" then upit=upit&" AND opis like '%"+opis+"%'" end if
    	
	SQL0="SET NOCOUNT ON DECLARE @GeoJSON VARCHAR(MAX) SET @GeoJSON = '{""type"": ""FeatureCollection"", ""features"": [' SELECT @GeoJSON += '{""type"": ""Feature"", ""geometry"": ' + dbo.geomToGeoJSON(prostorno) + ', ""properties"": { ""vrsta"": ""' + vrsta + '"",""podvrsta"": ""' + podvrsta + '"",""razred"": ""' + razred + '""}},' FROM  Table_1  WHERE  ID=2222 SET @GeoJSON = LEFT(@GeoJSON, LEN(@GeoJSON) - 1) + ']}'  SELECT @GeoJSON AS odziv"
	'Response.Buffer=true

DIM json
json=""

''	Set rs0 = Server.CreateObject("ADODB.Recordset")
 ''   Set cmd0 = Server.CreateObject("ADODB.Command")
''	Set cmd0.ActiveConnection = conn
''	cmd0.CommandText = SQL0
''	cmd0.CommandType = 1 ' adCmdText
''	cmd0.CommandTimeout = 900
''	Set rs0 =  cmd0.execute(SQL0,,1)
''	set cmd0 = Nothing
 ''   response.write rs0(0)
''	set rs0 = Nothing

'conn.close
'Set conn = Nothing
dim objRS
querystring = SQL0
'Set rs0 = Server.CreateObject("ADODB.Recordset")
set objRS = conn.execute(querystring)

Response.write objRS.GetString(,,vbTab,vbCrLf)


'rs0.Close
conn.Close
Set conn = nothing
response.write users


%>