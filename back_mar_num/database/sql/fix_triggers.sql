DROP TRIGGER IF EXISTS `generar_deuda`;
DROP TRIGGER IF EXISTS `actualizar_pago`;

DELIMITER $$
CREATE TRIGGER `generar_deuda` AFTER INSERT ON `ventas` FOR EACH ROW
BEGIN
    IF NEW.tipo_pago = 'FIADO' THEN
        INSERT INTO deudas (cliente_id, venta_id, monto, saldo_pendiente)
        VALUES (NEW.cliente_id, NEW.id, NEW.total, NEW.total);

        UPDATE clientes
        SET saldo_deuda = saldo_deuda + NEW.total
        WHERE id_cliente = NEW.cliente_id;
    END IF;
END$$
DELIMITER ;

DELIMITER $$
CREATE TRIGGER `actualizar_pago` AFTER INSERT ON `pagos` FOR EACH ROW
BEGIN
    UPDATE deudas
    SET saldo_pendiente = saldo_pendiente - NEW.monto
    WHERE id = NEW.deuda_id;

    UPDATE clientes c
    JOIN deudas d ON c.id_cliente = d.cliente_id
    SET c.saldo_deuda = c.saldo_deuda - NEW.monto
    WHERE d.id = NEW.deuda_id;

    UPDATE deudas
    SET estado = 'PAGADO'
    WHERE id = NEW.deuda_id AND saldo_pendiente <= 0;
END$$
DELIMITER ;
