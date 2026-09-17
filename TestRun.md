cd C:\Projects\RR
docker start rr-dynamodb
node RISKREGISTER\tools\serve-risk-local.js

http://localhost:3200/RISKREGISTER/frontend/dashboard.html

cd C:\Projects\RR
docker start rr-dynamodb
node AGM\tools\serve-agm-local.js

http://localhost:3100/AGM/frontend/records.html