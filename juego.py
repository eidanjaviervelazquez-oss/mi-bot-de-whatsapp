import random
numero_secreto =random. randint(1, 10)
print("--- !bienvenido al juego de adivinanzas! ---")
intento = int( input("adivina el numero (del 1 al 10): "))
if intento == numero_secreto:
    print("!felicidades, ganaste!")
else:
        print("!fallaste! el numero secreto era:", numero_secreto)
