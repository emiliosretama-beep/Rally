# Clips del copiloto: clave -> (texto español, texto inglés). Las claves las usa el juego.
NUM_ES=['','uno','dos','tres','cuatro','cinco','seis']
NUM_EN=['','one','two','three','four','five','six']
DIST_ES={40:'cuarenta',50:'cincuenta',60:'sesenta',70:'setenta',80:'ochenta',90:'noventa',100:'cien',110:'ciento diez',120:'ciento veinte',130:'ciento treinta',140:'ciento cuarenta',150:'ciento cincuenta',160:'ciento sesenta',170:'ciento setenta',180:'ciento ochenta',190:'ciento noventa',200:'doscientos'}
DIST_EN={40:'forty',50:'fifty',60:'sixty',70:'seventy',80:'eighty',90:'ninety',100:'one hundred',110:'one ten',120:'one twenty',130:'one thirty',140:'one forty',150:'one fifty',160:'one sixty',170:'one seventy',180:'one eighty',190:'one ninety',200:'two hundred'}
CLIPS={}
for s in range(1,7):
  CLIPS[f'L{s}']=(f'Izquierda {NUM_ES[s]}.',f'Left {NUM_EN[s]}.')
  CLIPS[f'R{s}']=(f'Derecha {NUM_ES[s]}.',f'Right {NUM_EN[s]}.')
CLIPS.update({
 'HL':('Horquilla izquierda.','Hair pin left.'),
 'HR':('Horquilla derecha.','Hair pin right.'),
 'long':('Larga.','Long.'),
 'grav':('Con grava.','Gravel inside.'),
 'wIce':('Con hielo.','On ice.'),
 'wSnow':('Con nieve.','On snow.'),
 'ice':('¡Hielo!','Ice, ice!'),
 'snow':('¡Nieve!','Snow!'),
 'jump':('Salto.','Jump.'),
 'bigJump':('¡Salto grande!','Big jump!'),
 'crest':('Rasante.','Crest.'),
 'caution':('¡Ojo!','Caution!'),
 'chain':('Y...','Into...'),
 'go':('¡Vamos!','Go, go!'),
 'finish':('¡Meta! Buen tramo, muy bien.','Finish! Good stage, well done.'),
 'record':('¡Meta! ¡Y nuevo récord, vamos!','Finish! And that is a new record, come on!'),
 'rally':('¡Meta! Rally completado. ¡Enhorabuena, campeón!','Finish! Rally complete. Congratulations, champion!'),
 'champ':('¡Meta! ¡Somos campeones del mundo! ¡Increíble!','Finish! We are world champions! Incredible!'),
 'champEnd':('¡Meta! Campeonato terminado. ¡Buen trabajo!','Finish! Championship over. Good job!'),
})
for d in DIST_ES: CLIPS[f'd{d}']=(DIST_ES[d].capitalize()+'.',DIST_EN[d].capitalize()+'.')
if __name__=='__main__': print(len(CLIPS),'clips'); [print(k,v) for k,v in CLIPS.items()]

# Uniones en español ("y" + lo siguiente) en un solo clip: la "y" sola no se puede generar limpia
CHAIN_ES={}
for s_ in range(1,7):
  CHAIN_ES[f'yL{s_}']=f'Y izquierda {NUM_ES[s_]}.'
  CHAIN_ES[f'yR{s_}']=f'Y derecha {NUM_ES[s_]}.'
CHAIN_ES.update({'yHL':'Y horquilla izquierda.','yHR':'Y horquilla derecha.','yjump':'Y salto.','ybigJump':'¡Y salto grande!','ycrest':'Y rasante.'})
