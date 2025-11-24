
<% 
		'da bude kao globalna promenljiva
		Dim conn
		
		if Request.ServerVariables("SERVER_NAME")="digitalniupravnik.com" or Request.ServerVariables("SERVER_NAME")="www.digitalniupravnik.com" then
		Set conn = Server.CreateObject("ADODB.Connection")
		conn.open ""
		end if
		
		if Request.ServerVariables("SERVER_NAME")="localhost" then
		Set conn = Server.CreateObject("ADODB.Connection")
		conn.open "Provider=SQLOLEDB;Server=.\SQLEXPRESS;Database=map;Trusted_Connection=yes;"
		'conn.open "DSN=karta;"
		end if
	


'Format SQL Query funtion
Private Function formatSQLInput(ByVal strInputEntry)

     'Remove malicous charcters from sql
     strInputEntry = Replace(strInputEntry, """", "", 1, -1, 1)
     
     'Else for Access and SQL server need to escape a single quote using two quotes
     strInputEntry = Replace(strInputEntry, "'", "''", 1, -1, 1)
     
     strInputEntry = Replace(strInputEntry, "[", "&#091;", 1, -1, 1)
     strInputEntry = Replace(strInputEntry, "]", "&#093;", 1, -1, 1)
     strInputEntry = Replace(strInputEntry, "<", "&lt;", 1, -1, 1)
     strInputEntry = Replace(strInputEntry, ">", "&gt;", 1, -1, 1)
     
     'Return
     formatSQLInput = strInputEntry
End Function 

%>


