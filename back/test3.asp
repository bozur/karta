<%@ Language=VBScript CODEPAGE="65001" %>
<% Option Explicit %>

<%
Response.LCID = 2074

Dim StartTime, EndTime
StartTime = Timer
Dim objCN ' ADO Connection object
Dim objRS ' ADO Recordset object
Dim strsql ' SQL query string
Dim conn
Dim objField0, objField1, objField2, objField3, objField4, objField5, objField6, objField7

Set conn = Server.CreateObject("ADODB.Connection")
conn.open "Provider=SQLOLEDB;Server=.\SQLEXPRESS;Database=map;Trusted_Connection=yes;"
'conn.open "DSN=karta;"

strsql = "select ID, vrsta, podvrsta, razred, vrijeme0, vrijeme1, tacke0, tacke from Table_1"
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
Set objField7 = objRS(7)


Response.write "{""type"":""FeatureCollection"",""features"":["
While Not objRS.EOF
	Response.write "{""type"":""Feature"",""geometry"":{""type"":"""
	Response.write objField6
	Response.write """,""coordinates"":"
    Response.write objField7
	response.write "},""properties"":{""id"":"""
	Response.write objField0
    Response.write """,""v"":"""
	Response.write objField1 
	Response.write """,""p"":"""
	Response.write objField2
	Response.write """,""r"":"""
	Response.write objField3
	Response.write """,""v0"":"""
	Response.write objField4
	Response.write """,""v1"":"""
	Response.write objField5
	Response.write """}}"
	objRS.MoveNext
	if Not objRS.EOF then response.write "," end if
Wend
Response.write "]}"

objRS.Close
conn.Close
Set conn = Nothing
Set objRS = Nothing
EndTime = Timer
'Response.write "<p>processing took "&(EndTime-StartTime)&" seconds<p>&nbsp;"
%>
