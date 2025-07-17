you can see there is a huge gap and mismatch of the coordinate in the pdf and browser ! 

I need your help in this case only ! - place the signature at the desired mouse click ! 

Not gonna lie : I have tried many approached , read docs --also the recent code is from LLM . 

If you have any other approach or anything which can align the placement of signature image , please contirbute ! 


FOrget about the ui part , that can be done afterwords ! 
Focusing on the main logic and key feature ,where user can sign and place the signature 

-----------
Don't worry about what happens after the signature , I mean the signed pdf will be uploaded to user's folder specific locatation at s3 ! 

---------
From my knowledge where there should be change is -------- ! 
- page.tsx : 60 , 113 

- addSignaturetoPDF function : pdfUtils 

--so yeah ! 