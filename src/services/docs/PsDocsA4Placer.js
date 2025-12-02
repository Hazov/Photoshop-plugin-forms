export class PsDocsA4Placer {

    // Функция расчета занимаемой площади слоя
     calculateArea(layer) {
        const bounds = layer.bounds;
        return (bounds.right - bounds.left) * (bounds.bottom - bounds.top);
    }

    // Переводим миллиметры в пиксели (для конкретного разрешения PPI вашего проекта)
     mmToPixels(mm, ppi = 300) {
        return UnitValue.fromPoints((mm / 25.4) * ppi);
    }



    async  arrangeLayers(layersData) {
        try {
            // Сортируем слои по убыванию площади
            layersData.sort((a, b) => calculateArea(b.layer) - calculateArea(a.layer));

            // Определяем рабочую область документа
            const doc = app.activeDocument;
            const docWidth = doc.width.as('pixels');  // Ширина листа в пикселях
            const docHeight = doc.height.as('pixels');  // Высота листа в пикселях

            // Переменные для текущего положения
            let currentX = 0;
            let currentY = 0;
            let lastSize = null;

            // Расстояние между слоями
            const gapBetweenSameSizes = mmToPixels(4); // 4 мм
            const gapBetweenDifferentSizes = mmToPixels(8); // 8 мм

            // Группы
            let groupIndex = 0;
            let previousGroup = null;

            // Основной цикл по каждому слою
            for (let data of layersData) {
                const originalLayer = data.layer;

                // Извлекаем слой из группы
                originalLayer.parent.move(originalLayer, ElementPlacement.PLACEATBEGINNING);

                // Копирование слоя
                for (let i = 0; i < data.count; i++) {
                    // Сначала проверяем наличие места
                    const layerCopy = originalLayer.duplicate(); // Дублируем слой

                    // Проверяем, поместится ли копия слоя справа
                    const layerWidth = layerCopy.bounds.right - layerCopy.bounds.left;
                    const nextX = currentX + layerWidth + (lastSize === layerCopy ? gapBetweenSameSizes : gapBetweenDifferentSizes);

                    if (nextX <= docWidth) {
                        // Есть место справа
                        layerCopy.translate(currentX, currentY);

                        // Обновляем позицию
                        currentX += layerWidth + (lastSize === layerCopy ? gapBetweenSameSizes : gapBetweenDifferentSizes);
                        lastSize = layerCopy;
                    } else {
                        // Нет места справа, идем вниз
                        currentY += layerCopy.bounds.bottom - layerCopy.bounds.top + gapBetweenDifferentSizes;
                        currentX = 0;

                        // Повторяем проверку места
                        if (currentY + layerCopy.bounds.bottom >= docHeight) {
                            // Нет места ни справа, ни внизу

                            // Пробуем повернуть слой на 90 градусов
                            layerCopy.rotate(-90, Transformation.CENTER);

                            // Пересчитываем положение
                            const rotatedWidth = layerCopy.bounds.right - layerCopy.bounds.left;
                            const rotatedNextX = currentX + rotatedWidth + (lastSize === layerCopy ? gapBetweenSameSizes : gapBetweenDifferentSizes);

                            if (rotatedNextX <= docWidth && currentY + layerCopy.bounds.bottom <= docHeight) {
                                // Теперь поместился после поворота
                                layerCopy.translate(currentX, currentY);

                                // Обновляем позицию
                                currentX += rotatedWidth + (lastSize === layerCopy ? gapBetweenSameSizes : gapBetweenDifferentSizes);
                                lastSize = layerCopy;
                            } else {
                                // Даже после поворота не удается разместить
                                // Формируем группу и прячем её
                                const group = doc.layerSets.add();
                                group.name = `group-${++groupIndex}`;
                                group.visible = false;
                                previousGroup = group;

                                // Ставим оригинал первого слоем в новом ряду
                                originalLayer.move(group, ElementPlacement.PLACEATBEGINNING);
                                break; // Переходим к следующему элементу массива
                            }
                        } else {
                            // Просто перемещаемся вниз
                            layerCopy.translate(currentX, currentY);
                            currentX += layerWidth + (lastSize === layerCopy ? gapBetweenSameSizes : gapBetweenDifferentSizes);
                            lastSize = layerCopy;
                        }
                    }
                }
            }

            // Если остались элементы в предыдущих группах, формируем новую группу
            if (previousGroup) {
                previousGroup.visible = false;
            }

            console.log('Размещение слоев завершено.');
        } catch (err) {
            console.error('Ошибка:', err.message);
        }
    }
    
}