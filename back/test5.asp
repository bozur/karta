<%@ Language=VBScript CODEPAGE="65001" %>

<%
Response.LCID = 2074

Function ProtectSQL(ByVal SQLString)
    'SQLString = Replace(SQLString, "'", "&#39;", 1, -1, 1) ' replace single Quotes with Double Quotes ...ukinuo da bi dodao ovo ispod
    SQLString = Replace(SQLString, "'", "''", 1, -1, 1)
    SQLString = Replace(SQLString, ">", "&gt;", 1, -1, 1) ' replace > with &gt;
    SQLString = Replace(SQLString, "<", "&lt;", 1, -1, 1) ' replace < with &lt;
    SQLString = Replace(SQLString, "(", "&#40;", 1, -1, 1) ' replace ( with &#40;
    SQLString = Replace(SQLString, ")", "&#41;", 1, -1, 1) ' replace ) with &#41;
    SQLString = Replace(SQLString, "&", "&amp;", 1, -1, 1)
    SQLString = Replace(SQLString, "%", "&#37;", 1, -1, 1)
    SQLString = Replace(SQLString, vblf, "<br />", 1, -1, 1) ' replace vblf with <br /> (This is mainly used for Memo fields).
    SQLString = Replace(SQLString, "[", "&#091;", 1, -1, 1) 'ovo sam ja dodao
    SQLString = Replace(SQLString, "]", "&#093;", 1, -1, 1) 'ovo sam ja dodao
    SQLString = Trim(SQLString)
    ProtectSQL = SQLString
End Function


Function ReverseSQL(ByVal SQLRevString)
    'SQLRevString = Replace(SQLRevString, "&#39;", "'", 1, -1, 1) 
    SQLRevString = Replace(SQLRevString, "''", "'", 1, -1, 1) 
    SQLRevString = Replace(SQLRevString, "&gt;", ">", 1, -1, 1) 
    SQLRevString = Replace(SQLRevString, "&lt;", "<", 1, -1, 1) 
    SQLRevString = Replace(SQLRevString, "&#40;", "(", 1, -1, 1) 
    SQLRevString = Replace(SQLRevString, "&#41;", ")", 1, -1, 1) 
    SQLRevString = Replace(SQLRevString, "&amp;", "&", 1, -1, 1)
    SQLRevString = Replace(SQLRevString, "&#37;", "%", 1, -1, 1)
    SQLRevString = Replace(SQLRevString, "<br />", vblf, 1, -1, 1)
    SQLRevString = Replace(SQLRevString, "&#091;", "[", 1, -1, 1) 'ovo sam ja dodao
    SQLRevString = Replace(SQLRevString, "&#093;", "]", 1, -1, 1) 'ovo sam ja dodao
    SQLRevString = Trim(SQLRevString)
    ReverseSQL = SQLRevString
End Function


Dim StartTime, EndTime
StartTime = Timer
Dim objCN ' ADO Connection object
Dim objRS ' ADO Recordset object
Dim strsql ' SQL query string
Dim conn
Dim objField0, objField1, objField2, objField3, objField4, objField5, objField6, objField7

Set conn = Server.CreateObject("ADODB.Connection")
conn.open "Provider=sqloledb;Server=.\SQLEXPRESS;Database=map;Trusted_Connection=yes;"

tabela=left(ProtectSQL(Request.Form("tabela")),3)
tabela="Table_"&tabela
'response.write(tabela)
vrsta=left(ProtectSQL(Request.Form("vrsta")),2)
podvrsta=left(ProtectSQL(Request.Form("podvrsta")),2)
razred=left(ProtectSQL(Request.Form("razred")),2)
'date0=Request.Form("date0")
'date1=Request.Form("date1")
prostorno=left(ProtectSQL(Request.Form("prostorno")),2)
vremenski=left(ProtectSQL(Request.Form("vremenski")),2)
izvor=left(ProtectSQL(Request.Form("izvor")),2)
opis=left(ProtectSQL(Request.Form("opis")),255)

'vrsta="1"
'podvrsta="0"
'razred="0"
'prostorno="1"
'vremenski="0"
'izvor="-1"
'opis="цр"


Dim upit
upit=0
If vrsta<>"" then upit=1 end if
If podvrsta<>"" then upit=1 end if
If razred<>"" then upit=1 end if
If prostorno<>"" then upit=1 end if
If vremenski<>"" then upit=1 end if
If izvor<>"-1" then upit=1 end if
If opis<>"" then upit=1 end if
' UBACITI ONU ZASTITU DA MOZE ZAHTEV SAMO SA ISTOG SERVERA DA DODJE!!!!!!!!!!!!!!!!!!!!!'
if upit=1 then 
    set cmd = server.createobject("ADODB.Command")
    strsql = "SELECT ID, vrsta, podvrsta, razred, vrijeme0, vrijeme1, tacke0, tacke FROM "&tabela&" WHERE vrsta LIKE ? AND podvrsta LIKE ? AND razred LIKE ? AND tp LIKE ? AND tv LIKE ? AND LEN(ISNULL(LTRIM(RTRIM(izvor)),''))>? AND opis like ?"
    'response.write(strsql)
    cmd.ActiveConnection = conn
    cmd.CommandText = strsql
    cmd.CommandType = 1 'adCmdText
    cmd.CommandTimeout = 900
    cmd.Prepared=true
    cmd.Parameters.Append cmd.CreateParameter("@vrsta", 202, 1, 3,"%" & vrsta & "%") '202='adVarWChar, 1=adParamInput
    cmd.Parameters.Append cmd.CreateParameter("@podvrsta", 202, 1, 3,"%" & podvrsta & "%") '202='adVarWChar, 1=adParamInput
    cmd.Parameters.Append cmd.CreateParameter("@razred", 202, 1, 3,"%" & razred & "%") '202='adVarWChar, 1=adParamInput
    'cmd.Parameters.Append cmd.CreateParameter("@vrijeme0", 3, 1, ,prvi) '3 = adInteger, 1=adParamInput
    'cmd.Parameters.Append cmd.CreateParameter("@vrijeme1", 3, 1, ,prvi) '3 = adInteger, 1=adParamInput
    cmd.Parameters.Append cmd.CreateParameter("@prostorno", 202, 1, 3,"%" & prostorno & "%") '202='adVarWChar, 1=adParamInput
    cmd.Parameters.Append cmd.CreateParameter("@vremenski", 202, 1, 3,"%" & vremenski & "%") '202='adVarWChar, 1=adParamInput
    cmd.Parameters.Append cmd.CreateParameter("@izvor", 202, 1, 3,izvor) '202='adVarWChar, 1=adParamInput
    cmd.Parameters.Append cmd.CreateParameter("@opis", 202, 1, 255, "%" & opis & "%") '202='adVarWChar, 1=adParamInput
    
    set objRS = cmd.Execute
else 
    strsql = "select ID, vrsta, podvrsta, razred, vrijeme0, vrijeme1, tacke0, tacke from "&tabela
    'response.write(strsql)
    ' Execute the SQL query and set the implicitly created recordset
    Set objRS = conn.Execute(strsql)
    ' Write out the results directly without using concatenation operator
end if


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
''Response.write "<p>processing took "&(EndTime-StartTime)&" seconds<p>&nbsp;"
%>
