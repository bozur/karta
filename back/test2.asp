<%@ Language=VBScript %>
<% Option Explicit %>

<%
Dim StartTime, EndTime
StartTime = Timer
Dim objCN ' ADO Connection object
Dim objRS ' ADO Recordset object
Dim strsql ' SQL query string
Dim conn
Dim objField0, objField1, objField2, objField3, objField4, objField5, objField6

		Set conn = Server.CreateObject("ADODB.Connection")
		conn.open "Provider=SQLOLEDB;Server=.\SQLEXPRESS;Database=map;Trusted_Connection=yes;"
		'conn.open "DSN=karta;"
' Prepare a SQL query string
'strsql = "select vrsta, podvrsta, razred, vrijeme0, vrijeme1, tacke0, tacke from Table_1"
strsql = "SET NOCOUNT ON DECLARE @GeoJSON VARCHAR(MAX) SET @GeoJSON = '{""type"": ""FeatureCollection"", ""features"": [' SELECT @GeoJSON += '{""type"": ""Feature"", ""geometry"": ' + dbo.geomToGeoJSON(prostorno) + ', ""properties"": { ""vrsta"": ""' + vrsta + '"",""podvrsta"": ""' + podvrsta + '"",""razred"": ""' + razred + '""}},' FROM  Table_1  WHERE  1=1 SET @GeoJSON = LEFT(@GeoJSON, LEN(@GeoJSON) - 1) + ']}'  SELECT @GeoJSON AS odziv"
' Execute the SQL query and set the implicitly created recordset
Set objRS = conn.Execute(strsql)
' Write out the results directly without using concatenation operator




Response.write objRS(0)


objRS.Close
conn.Close
Set conn = Nothing
Set objRS = Nothing
EndTime = Timer
Response.write "<p>processing took "&(EndTime-StartTime)&" seconds<p>&nbsp;"
%>
