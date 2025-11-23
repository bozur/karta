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
Dim objField0, objField1, objField2, objField3, objField4, objField5, objField6, objField7, objField8
Dim cmd

Set conn = Server.CreateObject("ADODB.Connection")
conn.open "Provider=SQLNCLI11;Server=.\SQLEXPRESS;Database=map;Trusted_Connection=yes;"
' UBACITI ONU ZASTITU DA MOZE ZAHTEV SAMO SA ISTOG SERVERA DA DODJE!!!!!!!!!!!!!!!!!!!!!'
Dim uid
Dim table

if IsNumeric(request.querystring("ID")) then 
uid=request.querystring("ID")
else 
uid=0
end if

if IsNumeric(request.querystring("table")) then 
table=request.querystring("table")
else 
table=0
end if

set cmd = server.createobject("ADODB.Command")
strsql = "select vrsta, podvrsta, razred, vrijeme0, vrijeme1, opis, izvor, tp, tv from Table_"&table&" WHERE ID= ?"
    
cmd.ActiveConnection = conn
cmd.CommandText = strsql
cmd.CommandType = 1 'adCmdText
cmd.CommandTimeout = 900
cmd.Prepared=true
cmd.Parameters.Append cmd.CreateParameter("@uid", 3, 1, ,uid) '3 = adInteger, 1=adParamInput
    
set objRS = cmd.Execute

Set objField0 = objRS(0)
Set objField1 = objRS(1)
Set objField2 = objRS(2)
Set objField3 = objRS(3)
Set objField4 = objRS(4)
Set objField5 = objRS(5)
Set objField6 = objRS(6)
Set objField7 = objRS(7)
Set objField8 = objRS(8)

	response.write "{""vrs"":"""
	Response.write objField0 
	Response.write """,""pod"":"""
	Response.write objField1
	Response.write """,""raz"":"""
	Response.write objField2
	Response.write """,""vri0"":"""
	Response.write objField3
	Response.write """,""vri1"":"""
	Response.write objField4
    Response.write """,""opi"":"""
	Response.write objField5
    Response.write """,""izv"":"""
	Response.write objField6
    Response.write """,""prostorno"":"""
	Response.write objField7
    Response.write """,""vremenski"":"""
	Response.write objField8
	Response.write """}"


objRS.Close
conn.Close
Set conn = Nothing
Set objRS = Nothing
EndTime = Timer
'Response.write "<p>processing took "&(EndTime-StartTime)&" seconds<p>&nbsp;"
%>
