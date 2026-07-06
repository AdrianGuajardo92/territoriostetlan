# Comparacion de direcciones asignadas del PDF contra Firestore

- PDF: `/Users/adrianguajardo/Downloads/Direcciones asignadas - Hojas de cálculo de Google.pdf`
- Fuente actual: Firestore `gestor-territorios-ls`, colecciones `territories` y `addresses`.
- Publicadores en PDF: 53
- Direcciones en PDF: 100
- Direcciones actuales en Firestore: 117 total, 115 activas, 2 eliminadas/archivadas.
- Activas y aun con el publicador del PDF: 5
- Activas, pero hoy el territorio esta con otra persona/equipo: 92
- No localizadas en Firestore activo: 3

## Direcciones que aun estan con el publicador del PDF
- Jessica Naomi Isas Ramírez | Hacienda La Primavera 1040 -> Territorio 5 (Completado) con Verónica Martínez, Marisol Isas, Jessica Isas
- Mauricio Chávez | Graciela Olmos 2300 -> Territorio 4 (Completado) con Mauricio Chávez, Alison González
- Rosaura Chávez | Motolinía 380A -> Territorio 7 (Completado) con Mauricio Chávez, Rosaura Chávez
- Verónica Martínez | C. Hacienda Hoaxtlan 1390 -> Territorio 5 (Completado) con Verónica Martínez, Marisol Isas, Jessica Isas
- Verónica Martínez | Hacienda San Martín de las Flores 2710 -> Territorio 5 (Completado) con Verónica Martínez, Marisol Isas, Jessica Isas

## No localizadas o posibles diferencias
- Alison Aime Gonzalez Pérez | C. Andrés bello | PDF: Territorio 11.
- Jorge Perea Campos | Av José María Iglesias 3892 | PDF: Territorio 12. Posible cercano: Av José María Iglesias 3886, Los Arrayanes, 44766 Guadalajara, Jal. (Territorio 12, score 0.57)
- Monserrat Ruiz Aguiar | Eleuterio González #169 Int. 2 | PDF: Territorio 10.

## Duplicadas dentro del PDF
- C. Hacienda de la Erre 2541: Abigail Romero (Territorio 5); Ma. Refugio Ramirez Montoya (Territorio 5)
- Hacienda San Martín de las Flores 2710: Abigail Romero (Territorio 5); Verónica Martínez (Territorio 5)

## Tabla completa
| Resultado | Publicador PDF | Direccion PDF | Territorio actual | Estado | Asignado actual |
|---|---|---|---|---|---|
| ACTIVA_OTRO_ASIGNADO | Abigail Romero | C. Hacienda de la Erre 2541 | Territorio 5 | Completado | Verónica Martínez, Marisol Isas, Jessica Isas |
| ACTIVA_OTRO_ASIGNADO | Abigail Romero | Hacienda San Martín de las Flores 2710 | Territorio 5 | Completado | Verónica Martínez, Marisol Isas, Jessica Isas |
| ACTIVA_OTRO_ASIGNADO | Adrián Merino Ramírez | Jesús Romo de Vivar 4582 | Territorio 11 | En uso | Cristina Ávila, Graciela Limones |
| ACTIVA_OTRO_ASIGNADO | Adrián Merino Ramírez | Rosario Romero 441 | Territorio 11 | En uso | Cristina Ávila, Graciela Limones |
| ACTIVA_OTRO_ASIGNADO | Adriana Nahomy Estrada Martínez | Del Furgón 2270 | Territorio 1 | En uso | Luis Hernández, Jehonatán Chávez |
| ACTIVA_OTRO_ASIGNADO | Adriana Nahomy Estrada Martínez | Perdiz 1515 | Territorio 1 | En uso | Luis Hernández, Jehonatán Chávez |
| ACTIVA_OTRO_ASIGNADO | Alicia Sánchez de Ramos | C. Emilio Rabaza 3571 | Territorio 12 | En uso | Adrián Guajardo |
| ACTIVA_OTRO_ASIGNADO | Alicia Sánchez de Ramos | Etiopía 536 | Territorio 12 | En uso | Adrián Guajardo |
| NO_LOCALIZADA | Alison Aime Gonzalez Pérez | C. Andrés bello | - | - | - |
| ACTIVA_OTRO_ASIGNADO | Alison Aime Gonzalez Pérez | C. Leonor Pintado 138 | Territorio 11 | En uso | Cristina Ávila, Graciela Limones |
| ACTIVA_OTRO_ASIGNADO | Alma Delia Romero Quezada | C. H 2819 | Territorio 7 | Completado | Mauricio Chávez, Rosaura Chávez |
| ACTIVA_OTRO_ASIGNADO | Alma Delia Romero Quezada | C. Miguel Ramos Arizpe 277 | Territorio 7 | Completado | Mauricio Chávez, Rosaura Chávez |
| ACTIVA_OTRO_ASIGNADO | Ana Griselda Ruiz Aguiar | C. Valentín Gómez Farías 42 | Territorio 2 | En uso | Carolina Segura, Fabiola Guajardo, Rosaura Chávez |
| ACTIVA_OTRO_ASIGNADO | Ana Griselda Ruiz Aguiar | Clemente Aguirre 71 | Territorio 2 | En uso | Carolina Segura, Fabiola Guajardo, Rosaura Chávez |
| ACTIVA_OTRO_ASIGNADO | Andrea Jared Alcázar Ballardo | C. Presa Oviachi 340 | Territorio 13 | En uso | Fabiola Guajardo, Montserrat Ruiz |
| ACTIVA_OTRO_ASIGNADO | Andrea Jared Alcázar Ballardo | Presa Sta Rosa 362 | Territorio 13 | En uso | Fabiola Guajardo, Montserrat Ruiz |
| ACTIVA_OTRO_ASIGNADO | April Sherece de Merino | C. Artemio del Valle Arizpe 2907 | Territorio 9 | Completado | Beker Alvizo, Gloria Romero, Jorge Perea |
| ACTIVA_OTRO_ASIGNADO | April Sherece de Merino | C. Artemio del Valle Arizpe 2999 | Territorio 9 | Completado | Beker Alvizo, Gloria Romero, Jorge Perea |
| ACTIVA_OTRO_ASIGNADO | Beker Alberto ALvizo Carrillo | C. Reforma 10 | Territorio 18 | Disponible | nadie |
| ACTIVA_OTRO_ASIGNADO | Beker Alberto ALvizo Carrillo | Loma Tapalpa Sur 8129 | Territorio 18 | Disponible | nadie |
| ACTIVA_OTRO_ASIGNADO | Brenda Susana Isas Ramírez | C. Niños Héroes 210 | Territorio 8 | En uso | Gabriel Segura, Mauricio Chávez, Jorge Perea |
| ACTIVA_OTRO_ASIGNADO | Brenda Susana Isas Ramírez | C. Río Reforma 1865 | Territorio 8 | En uso | Gabriel Segura, Mauricio Chávez, Jorge Perea |
| ACTIVA_OTRO_ASIGNADO | Carlos Ramos Íñiguez | C. Alvaro Obregon 195 | Territorio 20 | En uso | Maricela Murillo |
| ACTIVA_OTRO_ASIGNADO | Carlos Ramos Íñiguez | C. Zaragoza 62 | Territorio 20 | En uso | Maricela Murillo |
| ACTIVA_OTRO_ASIGNADO | Cecilia | Av. Circunvalación Oblatos 1337 | Territorio 3 | En uso | Alison González |
| ACTIVA_OTRO_ASIGNADO | Cecilia | Gral. Genovevo Rivas Guillén 1451 | Territorio 3 | En uso | Alison González |
| ACTIVA_OTRO_ASIGNADO | Cristina Ávila Ávila | C. San Carlos 136 | Territorio 9 | Completado | Beker Alvizo, Gloria Romero, Jorge Perea |
| ACTIVA_OTRO_ASIGNADO | Cristina Ávila Ávila | Dunas 242 | Territorio 9 | Completado | Beker Alvizo, Gloria Romero, Jorge Perea |
| ACTIVA_OTRO_ASIGNADO | Diego Alejandro Serrano | C. Rafael Buelna 1380 | Territorio 6 | Completado | Luis Hernández, Verónica Martínez, Rosaura Chávez |
| ACTIVA_OTRO_ASIGNADO | Diego Alejandro Serrano | Sta. Casilda 2423 | Territorio 6 | Completado | Luis Hernández, Verónica Martínez, Rosaura Chávez |
| ACTIVA_OTRO_ASIGNADO | Eliseba Pérez de Serrano | San Rafael 11A | Territorio 15 | En uso | Nahomy Estrada, Omega Gallardo, Ana Ruiz |
| ACTIVA_OTRO_ASIGNADO | Eliseba Pérez de Serrano | Yahualica 79 | Territorio 15 | En uso | Nahomy Estrada, Omega Gallardo, Ana Ruiz |
| ACTIVA_OTRO_ASIGNADO | Eva Fabiola González Pérez | C. Marcelino Rentería 4236 | Territorio 11 | En uso | Cristina Ávila, Graciela Limones |
| ACTIVA_OTRO_ASIGNADO | Eva Fabiola González Pérez | C. Salvador M. Lima 4211 | Territorio 11 | En uso | Cristina Ávila, Graciela Limones |
| ACTIVA_OTRO_ASIGNADO | Gabriela Abigail López de Silva | C. 10-A 2102A | Territorio 1 | En uso | Luis Hernández, Jehonatán Chávez |
| ACTIVA_OTRO_ASIGNADO | Gabriela Abigail López de Silva | C. 2 #2042 | Territorio 1 | En uso | Luis Hernández, Jehonatán Chávez |
| ACTIVA_OTRO_ASIGNADO | Gabriela Ramos de Martínez | C. Aurelia Guevara 4232 | Territorio 11 | En uso | Cristina Ávila, Graciela Limones |
| ACTIVA_OTRO_ASIGNADO | Gloria Romero de Santana | C. Carrillo Puerto 254 | Territorio 8 | En uso | Gabriel Segura, Mauricio Chávez, Jorge Perea |
| ACTIVA_OTRO_ASIGNADO | Gloria Romero de Santana | C. Glendale 222 | Territorio 8 | En uso | Gabriel Segura, Mauricio Chávez, Jorge Perea |
| ACTIVA_OTRO_ASIGNADO | Graciela Palafox de Limones | C. Ignacio T. Chávez 4418 | Territorio 10 | Completado | Ana Ruiz, Cristina Ávila |
| ACTIVA_OTRO_ASIGNADO | Graciela Palafox de Limones | Salvador Gálvez 3932 | Territorio 10 | Completado | Ana Ruiz, Cristina Ávila |
| ACTIVA_OTRO_ASIGNADO | Greta Lizeth Placencia Santana | C. Jarauta 653 | Territorio 2 | En uso | Carolina Segura, Fabiola Guajardo, Rosaura Chávez |
| ACTIVA_OTRO_ASIGNADO | Greta Lizeth Placencia Santana | Pedro A. Galván 569 | Territorio 2 | En uso | Carolina Segura, Fabiola Guajardo, Rosaura Chávez |
| ACTIVA_OTRO_ASIGNADO | Gritzel Nohely Hernández Murillo | Av. La Barca 6 | Territorio 15 | En uso | Nahomy Estrada, Omega Gallardo, Ana Ruiz |
| ACTIVA_OTRO_ASIGNADO | Gritzel Nohely Hernández Murillo | Jamay 40 | Territorio 15 | En uso | Nahomy Estrada, Omega Gallardo, Ana Ruiz |
| ACTIVA_OTRO_ASIGNADO | Guillermo Adrián Guajardo Pérez | C. Federico Medrano 4074 | Territorio 11 | En uso | Cristina Ávila, Graciela Limones |
| ACTIVA_OTRO_ASIGNADO | Guillermo Adrián Guajardo Pérez | C. Valentín Gómez Farías 2274 | Territorio 7 | Completado | Mauricio Chávez, Rosaura Chávez |
| ACTIVA_OTRO_ASIGNADO | Guillermo Adrián Guajardo Pérez | Priv. Nautla 27 | Territorio 7 | Completado | Mauricio Chávez, Rosaura Chávez |
| ACTIVA_OTRO_ASIGNADO | Jehonatan Chávez | Av. Benito Juárez 168 | Territorio 19 | En uso | Karina González, Ana Ruiz |
| ACTIVA_OTRO_ASIGNADO | Jehonatan Chávez | Reina Tzapozintli 441 | Territorio 19 | En uso | Karina González, Ana Ruiz |
| COINCIDE_PUBLICADOR | Jessica Naomi Isas Ramírez | Hacienda La Primavera 1040 | Territorio 5 | Completado | Verónica Martínez, Marisol Isas, Jessica Isas |
| NO_LOCALIZADA | Jorge Perea Campos | Av José María Iglesias 3892 | - | - | - |
| ACTIVA_OTRO_ASIGNADO | José Alberto Heredia | C. Pablo Valdez 2618 | Territorio 6 | Completado | Luis Hernández, Verónica Martínez, Rosaura Chávez |
| ACTIVA_OTRO_ASIGNADO | José Alberto Heredia | Sta. Casilda 2846 | Territorio 6 | Completado | Luis Hernández, Verónica Martínez, Rosaura Chávez |
| ACTIVA_OTRO_ASIGNADO | José Antonio Isas Ramírez | Av. Plutarco Elías Calles 864 | Territorio 6 | Completado | Luis Hernández, Verónica Martínez, Rosaura Chávez |
| ACTIVA_OTRO_ASIGNADO | José Antonio Isas Ramírez | Hacienda Zenzontla 2816A | Territorio 6 | Completado | Luis Hernández, Verónica Martínez, Rosaura Chávez |
| ACTIVA_OTRO_ASIGNADO | José Armando Galindo Flores | C. Pino | Territorio 1 | En uso | Luis Hernández, Jehonatán Chávez |
| ACTIVA_OTRO_ASIGNADO | José Armando Galindo Flores | Verdín 1725 | Territorio 1 | En uso | Luis Hernández, Jehonatán Chávez |
| ACTIVA_OTRO_ASIGNADO | José Martín Martínez Rodríguez | C. Sierra Madre 140 | Territorio 3 | En uso | Alison González |
| ACTIVA_OTRO_ASIGNADO | Julio Alfredo Mora Ledesma | C. Aldama 650 | Territorio 2 | En uso | Carolina Segura, Fabiola Guajardo, Rosaura Chávez |
| ACTIVA_OTRO_ASIGNADO | Julio Alfredo Mora Ledesma | C. Mariano Jiménez 438 | Territorio 2 | En uso | Carolina Segura, Fabiola Guajardo, Rosaura Chávez |
| ACTIVA_OTRO_ASIGNADO | Laura Valencia Alcazar Bayardo | Capulín 109 | Territorio 17 | En uso | Eliseba Serrano, Diego Serrano |
| ACTIVA_OTRO_ASIGNADO | Laura Valencia Alcazar Bayardo | Francisco I. Madero 79 | Territorio 17 | En uso | Eliseba Serrano, Diego Serrano |
| ACTIVA_OTRO_ASIGNADO | Leilany Zoe Silva López | C. María Uribe 359 | Territorio 10 | Completado | Ana Ruiz, Cristina Ávila |
| ACTIVA_OTRO_ASIGNADO | Luis Angel Ruiz Torres | C. Teresa Reynoso 4163 | Territorio 11 | En uso | Cristina Ávila, Graciela Limones |
| ACTIVA_OTRO_ASIGNADO | Luis Angel Ruiz Torres | Victoria Navarro 654 | Territorio 11 | En uso | Cristina Ávila, Graciela Limones |
| ACTIVA_OTRO_ASIGNADO | Luis Antonio Isas Ramírez | Manantiales 14 | Territorio 17 | En uso | Eliseba Serrano, Diego Serrano |
| ACTIVA_OTRO_ASIGNADO | Luis Antonio Isas Ramírez | Morelos 117 | Territorio 17 | En uso | Eliseba Serrano, Diego Serrano |
| ACTIVA_OTRO_ASIGNADO | Luis Daniel Hernández | Cto Malecón Ote 89-A | Territorio 9 | Completado | Beker Alvizo, Gloria Romero, Jorge Perea |
| ACTIVA_OTRO_ASIGNADO | Luis Daniel Hernández | Mariano Azuela 325 | Territorio 9 | Completado | Beker Alvizo, Gloria Romero, Jorge Perea |
| ACTIVA_OTRO_ASIGNADO | Ma. Refugio Ramirez Montoya | Batalla de Chilapa 2497 | Territorio 5 | Completado | Verónica Martínez, Marisol Isas, Jessica Isas |
| ACTIVA_OTRO_ASIGNADO | Ma. Refugio Ramirez Montoya | C. Hacienda de la Erre 2541 | Territorio 5 | Completado | Verónica Martínez, Marisol Isas, Jessica Isas |
| ACTIVA_OTRO_ASIGNADO | Margarita Ballardo de Alcázar | Artículo 123 #1190 | Territorio 8 | En uso | Gabriel Segura, Mauricio Chávez, Jorge Perea |
| ACTIVA_OTRO_ASIGNADO | Margarita Ballardo de Alcázar | C. Reforma 431 | Territorio 8 | En uso | Gabriel Segura, Mauricio Chávez, Jorge Perea |
| ACTIVA_OTRO_ASIGNADO | María Marta Auxilio Martínez Martínez | C. Hacienda Huescalapa 2170 | Territorio 5 | Completado | Verónica Martínez, Marisol Isas, Jessica Isas |
| ACTIVA_OTRO_ASIGNADO | María Marta Auxilio Martínez Martínez | Hacienda La Llave 2261 | Territorio 5 | Completado | Verónica Martínez, Marisol Isas, Jessica Isas |
| ACTIVA_OTRO_ASIGNADO | Maricela Murillo Romo | Careyes 84 | Territorio 14 | Completado | Cristina Ávila, Fabiola Guajardo, Jorge Perea |
| ACTIVA_OTRO_ASIGNADO | Maricela Murillo Romo | La Manzanilla 11 | Territorio 14 | Completado | Cristina Ávila, Fabiola Guajardo, Jorge Perea |
| ACTIVA_OTRO_ASIGNADO | Mariel Arce Prado | Apolonio Moreno 1684 | Territorio 4 | Completado | Mauricio Chávez, Alison González |
| ACTIVA_OTRO_ASIGNADO | Mariel Arce Prado | Apolonio Moreno 1895 | Territorio 4 | Completado | Mauricio Chávez, Alison González |
| ACTIVA_OTRO_ASIGNADO | Marisol Ramírez de Isas | Calle Emiliano Zapata 82 | Territorio 8 | En uso | Gabriel Segura, Mauricio Chávez, Jorge Perea |
| ACTIVA_OTRO_ASIGNADO | Marisol Ramírez de Isas | Río Cuale 2487 | Territorio 8 | En uso | Gabriel Segura, Mauricio Chávez, Jorge Perea |
| ACTIVA_OTRO_ASIGNADO | Mauricio Chávez | Bagdad 2 2958 | Territorio 6 | Completado | Luis Hernández, Verónica Martínez, Rosaura Chávez |
| ACTIVA_OTRO_ASIGNADO | Mauricio Chávez | C. Esteban Alatorre 2587 | Territorio 6 | Completado | Luis Hernández, Verónica Martínez, Rosaura Chávez |
| COINCIDE_PUBLICADOR | Mauricio Chávez | Graciela Olmos 2300 | Territorio 4 | Completado | Mauricio Chávez, Alison González |
| ACTIVA_OTRO_ASIGNADO | Miguel Ángel Silva Villalobos | C. Fernando Solís 1175 | Territorio 13 | En uso | Fabiola Guajardo, Montserrat Ruiz |
| ACTIVA_OTRO_ASIGNADO | Miguel Ángel Silva Villalobos | Manuel Gutiérrez Nájera 3444 | Territorio 12 | En uso | Adrián Guajardo |
| NO_LOCALIZADA | Monserrat Ruiz Aguiar | Eleuterio González #169 Int. 2 | - | - | - |
| ACTIVA_OTRO_ASIGNADO | Monserrat Ruiz Aguiar | Enrique Granados 3576 | Territorio 10 | Completado | Ana Ruiz, Cristina Ávila |
| ACTIVA_OTRO_ASIGNADO | Noemí Portocarrero Ruiz | C. Carlos R. Arévalo 4122 | Territorio 14 | Completado | Cristina Ávila, Fabiola Guajardo, Jorge Perea |
| ACTIVA_OTRO_ASIGNADO | Noemí Portocarrero Ruiz | Sayula 87 | Territorio 14 | Completado | Cristina Ávila, Fabiola Guajardo, Jorge Perea |
| ACTIVA_OTRO_ASIGNADO | Omar Gallardo Rivera | Av Presa de Osorio 3975 | Territorio 13 | En uso | Fabiola Guajardo, Montserrat Ruiz |
| ACTIVA_OTRO_ASIGNADO | Omar Gallardo Rivera | Presa del Infiernillo 3857 | Territorio 13 | En uso | Fabiola Guajardo, Montserrat Ruiz |
| ACTIVA_OTRO_ASIGNADO | Omega Hurtado Mesino | C. Pedro Moreno 69 | Territorio 16 | Disponible | nadie |
| COINCIDE_PUBLICADOR | Rosaura Chávez | Motolinía 380A | Territorio 7 | Completado | Mauricio Chávez, Rosaura Chávez |
| ACTIVA_OTRO_ASIGNADO | Rosaura Chávez | Prol. Medrano 234 | Territorio 17 | En uso | Eliseba Serrano, Diego Serrano |
| ACTIVA_OTRO_ASIGNADO | Silvia Blas Alvarado | Calle Juan Escutia 387 B | Territorio 19 | En uso | Karina González, Ana Ruiz |
| COINCIDE_PUBLICADOR | Verónica Martínez | C. Hacienda Hoaxtlan 1390 | Territorio 5 | Completado | Verónica Martínez, Marisol Isas, Jessica Isas |
| COINCIDE_PUBLICADOR | Verónica Martínez | Hacienda San Martín de las Flores 2710 | Territorio 5 | Completado | Verónica Martínez, Marisol Isas, Jessica Isas |
| ACTIVA_OTRO_ASIGNADO | Verónica Nayeli Ramirez Castellanos | C. José Pantoja Gómez 4236 | Territorio 14 | Completado | Cristina Ávila, Fabiola Guajardo, Jorge Perea |
