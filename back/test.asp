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
strsql = "select vrsta, podvrsta, razred, vrijeme0, vrijeme1, tacke0, tacke from Table_1"
' Execute the SQL query and set the implicitly created recordset
Set objRS = conn.Execute(strsql)
' Write out the results directly without using concatenation operator

Set objField0 = objRS(0)
Set objField1 = objRS(1)
Set objField2 = objRS(2)
Set objField3 = objRS(3)
Set objField4 = objRS(4)
Set objField5 = objRS(5)
Set objField6 = objRS(6)


Response.write "{""type"": ""FeatureCollection"", ""features"": ["
While Not objRS.EOF
	Response.write "{""type"": ""Feature"", ""geometry"": { ""type"": """
	Response.write objField5
	Response.write """, ""coordinates"": "
    Response.write objField6
	'if objField5="Point" then
	''	response.write objField7
	'else if objField5="LineString" then
'		response.write objField8
'	else if objField5="Polygon" then
'		response.write objField9
''	end if
	response.write "}, ""properties"": { ""vrsta"": """
	Response.write objField0 
	Response.write """,""podvrsta"": """
	Response.write objField1
	Response.write """,""razred"": """
	Response.write objField2
	Response.write """,""vrijeme0"": """
	Response.write objField3
	Response.write """,""vrijeme1"": """
	Response.write objField4
	Response.write """}}"
	Response.write vbCrLf
	objRS.MoveNext
	if Not objRS.EOF then response.write "," end if
Wend
Response.write "]}"

objRS.Close
conn.Close
Set conn = Nothing
Set objRS = Nothing
EndTime = Timer
Response.write "<p>processing took "&(EndTime-StartTime)&" seconds<p>&nbsp;"
%>
